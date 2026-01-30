# To start the FastAPI server, run the following command in the terminal:
# Activate your Python virtual environment (e.g., conda activate makeup-match or source venv/bin/activate)
# uvicorn server:app --reload --host 0.0.0.0 --port 8001

import random
from fastapi import FastAPI, HTTPException, Request, File, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import io
import csv
from lib import color_tools
from lib.foundation_matching import FoundationMatching
from lib.foundation_matching_service import FoundationMatchingService
from lib.firestore_product_service import FirestoreProductService
from lib.clients_db import ClientsDB
# from lib.face_feature_extraction import FaceFeatureExtractor
import base64
import os
import uvicorn
import shutil
import uuid
import json
from datetime import datetime
from PIL import Image
from io import BytesIO
from routers.monitoring import register_device_monitoring_endpoints
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from functools import wraps

# Authentication decorator for protected endpoints
def require_auth(func):
    """
    Decorator to require Firebase authentication for endpoints.
    Protects admin/dev endpoints from unauthorized access.
    """
    import asyncio
    import inspect
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Find Request object in arguments
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break
        if not request:
            request = kwargs.get('request')
        
        if not request:
            raise HTTPException(status_code=500, detail="Request object not found")
        
        # # Debug logging
        # print(f"=== Auth Decorator for {func.__name__} ===")
        # print(f"All headers: {dict(request.headers)}")
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        # print(f"Authorization header: {authorization}")
        
        if not authorization:
            print("❌ No Authorization header found!")
            raise HTTPException(
                status_code=401,
                detail="Authorization header missing. Please provide a valid Firebase ID token."
            )
        
        try:
            # Extract token from "Bearer <token>"
            parts = authorization.split()
            if len(parts) != 2 or parts[0].lower() != "bearer":
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authorization header format. Use: Bearer <token>"
                )
            
            token = parts[1]
            
            # Check if Firebase Admin is initialized
            if not firebase_admin._apps:
                print("ERROR: Firebase Admin SDK is not initialized!")
                raise HTTPException(
                    status_code=500,
                    detail="Authentication service not available"
                )
            
            # Verify the token with Firebase Admin SDK
            decoded_token = firebase_auth.verify_id_token(token)
            
            # Add user info to request state
            request.state.user = decoded_token
            
            # Call the function (handle both sync and async)
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
            
        except ValueError:
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization header format"
            )
        except firebase_auth.InvalidIdTokenError as e:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token: {str(e)}"
            )
        except firebase_auth.ExpiredIdTokenError:
            raise HTTPException(
                status_code=401,
                detail="Token expired. Please log in again."
            )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Authentication error: {type(e).__name__}: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail="Authentication failed"
            )
    
    return wrapper

class ServerConfig:
    def __init__(self, questions_path="questions.json"):
        self.questions_path = questions_path
        self.questions = None
        self.app = FastAPI()
        self.booting()

    def booting(self):
        print("Starting server...")
        
        # Initialize Firestore service
        try:
            # Check if running on GCP or locally
            service_account_path = None
            key_filename = 'key_firebase.json'
            
            if os.path.exists(key_filename):
                # Local development - use service account key file in current directory
                service_account_path = key_filename
                print(f"Using local service account key file: {key_filename}")
            elif os.path.exists(f'../{key_filename}'):
                # Alternative local path (parent directory)
                service_account_path = f'../{key_filename}'
                print(f"Using local service account key file: ../{key_filename}")
            else:
                # GCP environment - use default application credentials
                print("Using default application credentials (GCP environment)")
            
            self.firestore_service = FirestoreProductService(
                service_account_path=service_account_path,
                project_id=os.getenv('GOOGLE_CLOUD_PROJECT', 'your-gcp-project-id'),
                database_id=os.getenv('FIRESTORE_DATABASE_ID', 'your-firestore-database-id')
            )
            print("Firestore service initialized successfully")
            use_firestore = True
        except Exception as e:
            print(f"Firestore initialization failed: {e}")
            print("Falling back to local file system")
            self.firestore_service = None
            use_firestore = False
        
        # Initialize foundation matching service
        self.fm_service = FoundationMatchingService(
            firestore_service=self.firestore_service,
            use_firestore=use_firestore
        )
        
        # Keep backward compatibility
        self.fm = FoundationMatching(store_brand="dm")

        if os.path.exists(self.questions_path):
            with open(self.questions_path, "r", encoding="utf-8") as f:
                self.questions = json.load(f)
                print("Questions loaded successfully")

        # Initialize Firebase Admin SDK for authentication
        if not firebase_admin._apps:
            try:
                # Try to use service account key file
                cred = credentials.Certificate(f'../{key_filename}')
                firebase_admin.initialize_app(cred)
                print("Firebase Admin SDK initialized with service account")
            except Exception as e:
                print(f"Failed to initialize Firebase Admin with service account: {e}")
                try:
                    # Fallback: Use default credentials (for Google Cloud environments)
                    firebase_admin.initialize_app()
                    print("Firebase Admin SDK initialized with default credentials")
                except Exception as e2:
                    print(f"Failed to initialize Firebase Admin with default credentials: {e2}")
                    print("WARNING: Firebase authentication will not work!")

server = ServerConfig()
clients_db = None
if server.firestore_service:
    print("Using Firestore for client data storage")
    clients_db = ClientsDB().create(type="firestore", client=server.firestore_service.db)
else:
    print("Using local file system for client data storage")
    clients_db = ClientsDB().create(type="dummy")  # Placeholder, will be replaced below


app = server.app


# Enable CORS
origins = [
    "http://localhost",  # Allow access from localhost
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1",  # Allow access from loopback address
    "http://127.0.0.1:5173",  # Vite dev server
    "https://dev-makeupmatch.web.app",  # Your Firebase Hosting domain
    "https://dev-makeupmatch.firebaseapp.com",  # Alternative Firebase domain
    "https://your-project-id.ey.r.appspot.com",  # Your GCP backend domain
    "https://makeupmatch.web.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Add this to expose custom headers
)

register_device_monitoring_endpoints(app)

@app.post("/get_results")
@require_auth
async def get_results(request: Request):
    try:
        # Generate a unique user ID
        user_id = str(uuid.uuid4())

        body = await request.json()
        print("Received JSON:", body)

        answers = body["answers"]
        config = body["config"]
        store_brand = config["store_name"]
        store_location = config["store_location"]
        browser_name = config.get("browser_name", "unknown")

        camera_block_index = next((i for i, x in enumerate(answers) if x["type"] == "camera"), None)
        camera_block = answers[camera_block_index] if camera_block_index is not None else None
        if not camera_block:
            raise HTTPException(status_code=400, detail="Camera block not found")

        # Remove the image from the JSON
        answers[camera_block_index]["image"] = ""

        # Process the sensor data
        scan_block_index = next((i for i, x in enumerate(answers) if x["type"] == "scan"), None)
        scan_block = answers[scan_block_index] if scan_block_index is not None else None
        if not scan_block:
            raise HTTPException(status_code=400, detail="Scan block not found")

        colors = scan_block["scanResult"]
        avarage_color = server.fm_service.compute_average_color(colors)
        hex_colors = [color_tools.lab_to_hex(*color) for color in colors]
        print(avarage_color)
        client = {
            "color": color_tools.lab_to_hex(*avarage_color),
        }
        scan_block["scanResult_hex"] = hex_colors

        scan_block["avarage_color"] = avarage_color
        scan_block["avarage_color_hex"] = color_tools.lab_to_hex(*avarage_color)

        # Process the option data
        option_data = {}
        for answer in answers:
            if answer["type"] == "options" and "answer" in answer.keys() and "question_name" in answer.keys():
                # Convert single string to list
                if isinstance(answer["answer"], str):
                    option_data[answer["question_name"]] = answer["answer"]
  

        # Process the received JSON as needed
        # Return a JSON response
        products = server.fm_service.match_foundation(
            target_color=avarage_color,
            store_brand=store_brand,
            store_location=store_location,
            length=100
        )

        

        # Add a timestamp
        timestamp = datetime.now().isoformat()
        feedback_questionary = [
            "Did you had a product on your mind before coming to the store?",
            "Did you try the recommended products?",
            "Was the recommended product in a store?",
            "Did you change your mind after using the Makeup Match?",
            "How many products did you try before buying?",
            "Which product did you buy?", 
            "What is the most important factor when buying a teint product?",
            "Do you have preferences for a specific brand?",
            "Would you switch to a different brand if the product has better color match?",
            "Comments"
            ]
        feedback_dict = [{"question": question, "answer": ""} for question in feedback_questionary]
        client_info = {
            "client_id": user_id,
            "timestamp_mm": timestamp,
            "info_mm": answers,
            "photo_path": "",
            "timestamp_feedback": None,
            "info_feedback": feedback_dict,
        }
        # Save the return information
        return_info = {
            "user_id": user_id,
            "timestamp": timestamp,
            "client": client,
            "products": products,
            "product_types": server.fm_service.get_product_types(store_brand)
        }
        if server.firestore_service:
            print("Saving client info to Firestore")
            try:
                clients_db.save_new_client( 
                    client_id=user_id,
                    face_landmarks=camera_block,
                    colors_lab=colors,
                    colors_hex=hex_colors,
                    color_avg_lab=avarage_color,
                    color_avg_hex=color_tools.lab_to_hex(*avarage_color),
                    option_data=option_data,
                    retailer=store_brand,
                    store_location=store_location,
                    browser_name=browser_name,
                    clarity_id="", # TODO: save clarity id
                    result_page_timestamp=timestamp,
                    recommendation_results=products,
                )
                print(f"Successfully saved client {user_id} to Firestore")
            except Exception as firestore_error:
                print(f"Firestore save error: {type(firestore_error).__name__}: {str(firestore_error)}")
                print(f"Firestore error details: {repr(firestore_error)}")
                # Continue execution but log the error
        else:
            print("Saving client info to local file system")
            clients_db.save_new_client(client_info)
        # clients_db.save_result(user_id, return_info)
        return return_info
    except Exception as e:
        print(f"Error in get_results: {type(e).__name__}: {str(e)}")
        print(f"Error details: {repr(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    
@app.post("/get_results_without_saving")
@require_auth
async def get_results_without_saving(request: Request):
    try:
        body = await request.json()
        avarage_color = body.get("target_color", [0, 0, 0])
        store_brand = body.get("store_brand", "dm")
        store_location = body.get("store_location", "D522")
        length = body.get("length", 100)

        products = server.fm_service.match_foundation(
            target_color=avarage_color,
            store_brand=store_brand,
            store_location=store_location,
            length=length,
            include_scanning_history=True
        )
        return {"products": products}
    except Exception as e:
        print(f"Error in get_results_without_saving: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    
@app.post("/get_all_products")
@require_auth
async def get_products_without_saving(request: Request):
    try:
        body = await request.json()
        avarage_color = body.get("target_color", [0, 0, 0])
        store_brand = body.get("store_brand", "dm")
        store_location = body.get("store_location", "D522")
        length = body.get("length", 100)

        products = server.fm_service.match_foundation(
            target_color=avarage_color,
            store_brand=store_brand,
            store_location=store_location,
            length=length,
            include_scanning_history=True,
            only_rescanned=False
        )
        return {"products": products}
    except Exception as e:
        print(f"Error in get_results_without_saving: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.get("/get_results_by_user_id/{user_id}")
async def get_results_by_user_id(user_id: str):
    # dummy implementation
    try:
        try:
            # skin_tone = clients_db.get_client_skin_tone(user_id)
            skin_data = clients_db.get_client_all_skin_data(user_id)
            color_points = [[point["L"], point["a"], point["b"]] for key, point in skin_data.items()]
            skin_tone = server.fm_service.compute_average_color(color_points)
        except Exception as skin_tone_error:
            print(f"Error retrieving skin tone for user {user_id}: {type(skin_tone_error).__name__}: {str(skin_tone_error)}")
            skin_tone = [0,0,0]
        if skin_tone == [0,0,0]:
            print(f"Warning: Retrieved skin tone is {skin_tone}, using random color instead")
            L = random.uniform(30, 50)
            a = random.uniform(10, 20)
            b = random.uniform(10, 20)
            avarage_color = [L, a, b]
        else:
            avarage_color = skin_tone
        client = {
            "color": color_tools.lab_to_hex(*avarage_color),
        }
        store_brand = "dm"
        store_location = "D522"
        products = server.fm_service.match_foundation(
            target_color=avarage_color,
            store_brand=store_brand,
            store_location=store_location,
            length=100
        )
        timestamp = datetime.now().isoformat()

        return_info = {
            "user_id": user_id,
            "timestamp": timestamp,
            "client": client,
            "products": products,
            "product_types": server.fm_service.get_product_types(store_brand)
        }
        return return_info
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user_flow/exit/{user_id}")
@require_auth
async def user_flow_exit(user_id: str, request: Request):
    try:
        # Handle user flow exit logic
        body = await request.json()
        filters = body.get("filters", {})
        final_recommendations = body.get("final_recommendations", [])
        if server.firestore_service:
            print(f"Recording user flow exit for user {user_id} in Firestore")
            clients_db.exit_update(
                user_id, 
                exit_timestamp=datetime.now().isoformat(), 
                filters=filters, 
                final_recommendations=final_recommendations
            )
        return {"message": "User flow exit recorded"}
    except Exception as e:
        print(f"Error in user_flow_exit: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    
@app.post("/feedback")
async def submit_feedback(request: Request):
    try:
        body = await request.json()
        user_id = body.get("user_id", "")
        rating = body.get("rating", 0)
        improvements = body.get("improvements", [])
        opinions = body.get("opinions", "")
        print(f"Received feedback from user {user_id}: rating={rating}, improvements={improvements}, opinions={opinions}")
        if not user_id or not rating:
            raise HTTPException(status_code=400, detail="user_id and rating are required")

        if server.firestore_service:
            print(f"Submitting feedback for user {user_id} to Firestore")
            clients_db.save_feedback(
                user_id, 
                rating=rating,
                improvements=improvements,
                opinions=opinions
            )
            return {"message": "Feedback submitted successfully"}
        else:
            raise HTTPException(status_code=503, detail="Firestore service not available")
    except Exception as e:
        print(f"Error in submit_feedback: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    

@app.get("/clients_db")
@require_auth
async def get_clients_db(request: Request):
    try:
        if server.firestore_service:
            print("Fetching all clients from Firestore")
            return clients_db.generate_summary_table()
        else:
            print("Clients DB not available")
    except Exception as e:
        print(f"Error in get_clients_db: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    
@app.get("/download_clients_db")
@require_auth
async def download_clients_db(request: Request):
    try:
        if server.firestore_service:
            print("Downloading clients DB from Firestore")
            
            # Generate CSV content using the clients_db method
            csv_content = clients_db.generate_csv_stream()
            
            # Create streaming response
            return StreamingResponse(
                io.BytesIO(csv_content.encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=clients_summary.csv"}
            )
        else:
            raise HTTPException(status_code=503, detail="Firestore service not available")
            
    except ValueError as ve:
        print(f"Data error in download_clients_db: {str(ve)}")
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        print(f"Error in download_clients_db: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")

@app.get("/get_history/{user_id}")
@require_auth
async def get_history(request: Request, user_id: str):
    try:
        return_info = clients_db.get_result(user_id)
        return return_info
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="User ID not found")
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_all_clients")
@require_auth
async def get_all_clients(request: Request):
    try:
        # Return the metadata of all clients
        return JSONResponse(content=clients_db.get_all_clients())
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_client/{client_id}")
@require_auth
async def get_client_endpoint(request: Request, client_id: str):
    try:
        client = clients_db.get_client(client_id)
        return client
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/get_client_with_product_details/{client_id}")
@require_auth
async def get_client_with_product_details(request: Request, client_id: str):
    try:
        client = clients_db.get_client_with_product_details(client_id, server.fm_service)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        # Fetch product details for the client
        return client
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update_client")
@require_auth
async def update_client_endpoint(request: Request):
    try:
        body = await request.json()
        client = body["client"]
        clients_db.update_client(client)
        return JSONResponse(content={"message": "Client updated successfully"})
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/store_brands")
@require_auth
def get_store_brands(request: Request):
    try:
        # Return the list of store brands
        return server.fm_service.brand_list
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/product/{store_brand}/{id}")
@require_auth
def get_product(request: Request, store_brand: str, id: str):
    try:
        print(f"Fetching product {id} for store brand {store_brand}")
        product = server.fm_service.get_product_by_gtin(store_brand, id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"product": product}
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bundle_products")
async def bundle_products(request: Request):
    try:
        body = await request.json()
        user_id = body.get("user_id", "")
        store_brand = body.get("store_brand", "dm")
        store_name = body.get("store_name", "D522")
        product_id = body.get("product_id", "")

        product = server.fm_service.get_product_by_gtin(store_brand, product_id)
        
        if not product:
            raise HTTPException(status_code=404, detail="Main product not found")
        
        response = {
            "user_id": user_id,
            "main_product": {
                "image": product.get("image_path", ""),
                "brand": product.get("brand", ""),
                "description": product.get("title", ""),
                "type": product.get("type", ""),
                "price": f'{product.get("price", "")} €',
                "availability": product.get("availability", "available"),
                "product_id": product_id
            }, 
        }
        mockup_bundle = [
                {
                "image": "https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1755092829/assets/pas/images/7ee5cdb5-e0ca-4d90-9605-3b919a340668/ebelin-professional-rougepinsel",
                "brand": "ebelin PROFESSIONAL",
                "description": "Rougepinsel",
                "price": "4,45 €",
                "availability": "available",
                "product_id": "4067796198836"
                },
                {
                "image": "https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1754953522/assets/pas/images/4d125075-6593-4524-8a42-b6ac77134fc9/ebelin-make-up-ei-und-baking-sponge",
                "brand": "ebelin",
                "description": "Make Up Ei & Baking Sponge",
                "price": "2,75 €",
                "availability": "available",
                "product_id": "4066447744903"
                },
                {
                "image": "https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1753399083/assets/pas/images/adb3c6dc-5cc2-48b6-a0fd-db1e0b7d1621/no-cosmetics-gesichtscreme-all-in-barrier",
                "brand": "Nø Cosmetics",
                "description": "Gesichtscreme All-In Barrier, 50 ml",
                "price": "16,95 €",
                "availability": "online",
                "product_id": "4260524941401"
                },
                {
                "image": "https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1747492230/assets/pas/images/1cf12bd1-23c8-4d37-bff5-9438c92014ad/yeauty-augenpads-energy-elixir-1-paar",
                "brand": "Yeauty",    
                "description": "Augenpads Energy Elixir (1 Paar), 2 St",
                "price": "0,95 €",
                "availability": "online",
                "product_id": "4260199892503"
                }
            ]
        
        try: 
            # Get personalized bundle
            features = clients_db.get_client_features(user_id)
            option_data = features.get("option_data", {})
            hair_color = option_data.get("hair_color", "")
            skin_type = option_data.get("skin_type", "")
            skin_color = features.get("color_avg_lab", {})
            cie_lab = [skin_color.get("L", 0), skin_color.get("a", 0), skin_color.get("b", 0)]
            personalized_bundle = server.fm_service.bundle_match(hair_color=hair_color, skin_type=skin_type, skin_color=cie_lab, retail=store_brand, store_id=store_name)
            response["bundle"] = personalized_bundle
        except Exception as e:
            print(f"Error fetching personalized bundle: {str(e)}")
            print("Falling back to mockup bundle")
            response["bundle"] = mockup_bundle
        
        return response
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/product-data/{store_brand}")
@require_auth
def get_foundation_data(request: Request, store_brand: str):
    try:
        products = server.fm_service.get_products(store_brand)
        if not products:
            raise HTTPException(status_code=404, detail="Store brand not found or no data available")
        return {"data": products}
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/product-types/{store_brand}")
@require_auth
def get_product_types(store_brand: str):
    try:
        product_types = server.fm_service.get_product_types(store_brand)
        return {"product_types": product_types}
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/products/search")
@require_auth
async def search_products(request: Request):
    try:
        body = await request.json()
        
        target_color = body.get("color", [])
        store_brand = body.get("store_brand", "")
        store_location = body.get("store_location")
        product_type = body.get("product_type")
        limit = body.get("limit", 10)
        
        if not target_color or not store_brand:
            raise HTTPException(status_code=400, detail="color and store_brand are required")
        
        products = server.fm_service.match_foundation(
            target_color=target_color,
            store_brand=store_brand,
            store_location=store_location,
            length=limit,
            product_type=product_type
        )
        
        return {"products": products}
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cache/clear")
@require_auth
async def clear_cache(request: Request):
    try:
        server.fm_service.clear_cache()
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cache/info")
@require_auth
async def get_cache_info(request: Request):
    try:
        cache_info = server.fm_service.get_cache_info()
        return cache_info
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/questions")
@require_auth
def get_questions(request: Request):
    try:
        if server.questions is None:
            raise HTTPException(status_code=404, detail="Questions not found")
        return server.questions
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

# Firestore product management endpoints
@app.post("/firestore/products")
@require_auth
async def create_firestore_product(request: Request):
    """Create a new product in Firestore"""
    try:
        if not server.firestore_service:
            raise HTTPException(status_code=503, detail="Firestore service not available")
        
        body = await request.json()
        product_id = body.get("product_id")
        product_data = body.get("product_data", {})
        created_by = body.get("created_by", "api_user")
        
        if not product_id or not product_data:
            raise HTTPException(status_code=400, detail="product_id and product_data are required")
        
        success = server.firestore_service.create_product(product_id, product_data, created_by)
        
        if success:
            return {"message": f"Product {product_id} created successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to create product")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/firestore/products/{product_id}")
@require_auth
async def update_firestore_product(request: Request, product_id: str):
    """Update a product in Firestore"""
    try:
        if not server.firestore_service:
            raise HTTPException(status_code=503, detail="Firestore service not available")
        
        body = await request.json()
        updates = body.get("updates", {})
        updated_by = body.get("updated_by", "api_user")
        
        if not updates:
            raise HTTPException(status_code=400, detail="updates are required")
        
        success = server.firestore_service.update_product(product_id, updates, updated_by)
        
        if success:
            return {"message": f"Product {product_id} updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Product not found")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/firestore/products/{product_id}")
@require_auth
async def get_firestore_product(request: Request, product_id: str):
    """Get a product from Firestore"""
    try:
        if not server.firestore_service:
            raise HTTPException(status_code=503, detail="Firestore service not available")
        
        product = server.firestore_service.get_product_current(product_id)
        
        if product:
            return {"product": product}
        else:
            raise HTTPException(status_code=404, detail="Product not found")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/firestore/products/{product_id}/history")
@require_auth
async def get_firestore_product_history(request: Request, product_id: str):
    """Get the full history of a product from Firestore"""
    try:
        if not server.firestore_service:
            raise HTTPException(status_code=503, detail="Firestore service not available")
        
        # This would require adding a get_product_history method to FirestoreProductService
        # For now, return a placeholder
        return {"message": "Product history endpoint - to be implemented"}
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/firestore/products/batch")
@require_auth
async def batch_create_firestore_products(request: Request):
    """Create multiple products in Firestore"""
    try:
        if not server.firestore_service:
            raise HTTPException(status_code=503, detail="Firestore service not available")
        
        body = await request.json()
        products = body.get("products", [])
        
        if not products:
            raise HTTPException(status_code=400, detail="products list is required")
        
        successful, failed = server.firestore_service.batch_create_products(products)
        
        return {
            "message": f"Batch creation completed",
            "successful": successful,
            "failed": failed
        }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/firestore/store-brands")
@require_auth
async def get_firestore_store_brands(request: Request):
    """Get all store brands from Firestore"""
    try:
        if not server.firestore_service:
            raise HTTPException(status_code=503, detail="Firestore service not available")
        
        brands = server.firestore_service.get_store_brands()
        return {"store_brands": brands}
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/firestore/product-types")
@require_auth
async def get_firestore_product_types(request: Request, store_brand: str = None):
    """Get all product types from Firestore, optionally filtered by store brand"""
    try:
        if not server.firestore_service:
            raise HTTPException(status_code=503, detail="Firestore service not available")
        
        product_types = server.firestore_service.get_product_types(store_brand)
        return {"product_types": product_types}
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/firestore/products/color-match")
@require_auth
async def firestore_color_match(request: Request):
    """Match products by color using Firestore"""
    try:
        if not server.firestore_service:
            raise HTTPException(status_code=503, detail="Firestore service not available")
        
        body = await request.json()
        
        target_color = body.get("color", [])
        store_brand = body.get("store_brand", "")
        product_type = body.get("product_type")
        limit = body.get("limit", 10)
        
        if not target_color or not store_brand:
            raise HTTPException(status_code=400, detail="color and store_brand are required")
        
        products = server.firestore_service.match_products_by_color(
            target_color=target_color,
            store_brand=store_brand,
            product_type=product_type,
            limit=limit
        )
        
        return {"products": products}
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/status")
@require_auth
async def get_system_status(request: Request):
    """Get system status including Firestore connectivity"""
    try:
        status = {
            "firestore_available": server.firestore_service is not None,
            "foundation_matching_service": "active",
            "cache_info": server.fm_service.get_cache_info(),
            "supported_stores": server.fm_service.brand_list
        }
        
        if server.firestore_service:
            # Test Firestore connection
            try:
                brands = server.firestore_service.get_store_brands()
                status["firestore_connection"] = "connected"
                status["firestore_brands"] = brands
            except Exception as e:
                status["firestore_connection"] = "error"
                status["firestore_error"] = str(e)
        
        return status
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/cache")
@require_auth
async def get_cache_stats(request: Request):
    """Get Firestore cache statistics"""
    try:
        if server.firestore_service:
            stats = server.firestore_service.get_cache_stats()
            return stats
        else:
            return {"error": "Firestore service not available"}
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/cache/clear")
@require_auth
async def clear_cache(request: Request):
    """Clear Firestore cache"""
    try:
        if server.firestore_service:
            server.firestore_service.clear_cache()
            return {"message": "Cache cleared successfully"}
        else:
            return {"error": "Firestore service not available"}
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/cache/ttl")
@require_auth
async def set_cache_ttl(request: Request):
    """Set cache TTL (time to live)"""
    try:
        body = await request.json()
        ttl_seconds = body.get("ttl_seconds", 300)
        
        if server.firestore_service:
            server.firestore_service.set_cache_ttl(ttl_seconds)
            return {"message": f"Cache TTL set to {ttl_seconds} seconds"}
        else:
            return {"error": "Firestore service not available"}
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
