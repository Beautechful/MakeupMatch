from http import client
import os
import json
import io
import csv
from datetime import datetime
from typing import Any, Dict, List, Optional
class ClientsDB:
    """
    Factory class to return the appropriate client DB handler (local or dummy).
    Usage: db = ClientsDB.create(type="local")
    """
    @staticmethod
    def create(type: str = "local", clients_dir: str = "clients", results_dir: str = "results", client=None):
        if type == "local":
            return ClientsDBLocal(clients_dir, results_dir)
        elif type == "dummy":
            return ClientsDBDummy()
        elif type == "firestore":
            return ClientsDBFirestore(client)
        else:
            raise ValueError("Unsupported database type. Use 'local' or 'dummy'.")

class ClientsDBDummy:
    def __init__(self):
        pass
    
    def save_new_client(self, client: Dict[str, Any]):
        print(f"Dummy save for client: {client['client_id']} at {client['timestamp_mm']}")

    def get_client(self, client_id: str) -> Dict[str, Any]:
        print(f"Dummy get for client: {client_id}")
        return {"client_id": client_id, "data": "dummy data"}
    
    def save_result(self, user_id: str, return_info: Dict[str, Any]):
        print(f"Dummy save result for user: {user_id} with info: {return_info}")

    def get_result(self, user_id: str) -> Dict[str, Any]:
        print(f"Dummy get result for user: {user_id}")
        return {"user_id": user_id, "data": "dummy result data"}
    
    def update_client(self, client: Dict[str, Any]):
        print(f"Dummy update for client: {client['client_id']} at {client['timestamp_feedback']}")  
class ClientsDBLocal:
    def __init__(self, clients_dir="clients", results_dir="results"):
        self.clients_dir = clients_dir
        self.results_dir = results_dir
        self.metadata_path = os.path.join(self.clients_dir, "metadata.json")
        self.data_dir = os.path.join(self.clients_dir, "data")
        self.photos_dir = os.path.join(self.clients_dir, "photos")
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.photos_dir, exist_ok=True)
        os.makedirs(self.results_dir, exist_ok=True)
        self.clients = self._load_metadata()

    def _load_metadata(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def save_metadata(self):
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.clients, f)

    def save_new_client(self, client: Dict[str, Any]):
        metadata = {
            "client_id": client["client_id"],
            "timestamp": client["timestamp_mm"],
            "photo_path": client["photo_path"],
        }
        self.clients.append(metadata)
        self.save_metadata()
        self.update_client(client)

    def get_client(self, client_id: str) -> Dict[str, Any]:
        with open(os.path.join(self.data_dir, f"{client_id}.json"), "r", encoding="utf-8") as f:
            return json.load(f)

    def update_client(self, client: Dict[str, Any]):
        client["timestamp_feedback"] = datetime.now().isoformat()
        with open(os.path.join(self.data_dir, f"{client['client_id']}.json"), "w", encoding="utf-8") as f:
            json.dump(client, f)

    def save_result(self, user_id: str, return_info: Dict[str, Any]):
        with open(os.path.join(self.results_dir, f"{user_id}.json"), "w", encoding="utf-8") as f:
            json.dump(return_info, f)

    def get_result(self, user_id: str) -> Dict[str, Any]:
        file_path = os.path.join(self.results_dir, f"{user_id}.json")
        if not os.path.exists(file_path):
            raise FileNotFoundError("User ID not found")
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_all_clients(self) -> List[Dict[str, Any]]:
        return self.clients


class ClientsDBFirestore:
    # Firestore client should be passed during initialization
    def __init__(self, client):
        self.client = client
        self.clients_collection = self.client.collection("clients")
        self.clients_summary_collection = self.client.collection("clients_summary")
        docs = self.clients_summary_collection.stream()
        self.summary = {}
        for doc in docs:
            try:
                # Convert string document IDs to integers for indexing
                doc_index = int(doc.id)
                self.summary[doc_index] = doc.to_dict()
            except ValueError:
                # Skip documents with non-integer IDs
                print(f"Skipping document with non-integer ID: {doc.id}")
                continue
        
        if not self.summary:
            # No existing summary documents, start with index 0
            self.current_summary_index = 0
            self.create_summary_doc(0)
        else:
            # Use the highest existing index
            self.current_summary_index = max(self.summary.keys())
            
        print(f"Initialized ClientsDBFirestore with summary index: {self.current_summary_index}")
        print(f"Existing summary keys: {list(self.summary.keys())}")

    def create_summary_doc(self, index: int):
        self.clients_summary_collection.document(str(index)).set({})
        self.summary[index] = {}

    def summary_pointer(self) -> int:
        # Check if current index exists and has space
        current_summary = self.summary.get(self.current_summary_index, {})
        if len(current_summary) >= 50:
            self.current_summary_index += 1
            # Don't create the document here, it will be created when needed
        return self.current_summary_index

    def find_summary_index(self, client_id: str) -> Optional[int]:
        for index, ids in self.summary.items():
            if client_id in ids.keys():
                return index
        return self.summary_pointer()

    def save_new_client(self, 
                        client_id,
                        face_landmarks,
                        colors_lab,
                        colors_hex,
                        color_avg_lab,
                        color_avg_hex,
                        option_data,
                        retailer,
                        store_location,
                        browser_name,
                        clarity_id,
                        result_page_timestamp,
                        recommendation_results,
                        ):
        
        # Save new client
        # 2 firestore writes

        data = {
            "client_id": client_id,
            "features": {
                 "colors_lab": {"1": {"L": colors_lab[0][0], "a": colors_lab[0][1], "b": colors_lab[0][2]},
                               "2": {"L": colors_lab[1][0], "a": colors_lab[1][1], "b": colors_lab[1][2]},
                               "3": {"L": colors_lab[2][0], "a": colors_lab[2][1], "b": colors_lab[2][2]}},
                "colors_hex": {"1": colors_hex[0], "2": colors_hex[1], "3": colors_hex[2]},
                "color_avg_lab": {"L": color_avg_lab[0], "a": color_avg_lab[1], "b": color_avg_lab[2]},
                "color_avg_hex": color_avg_hex,
                "face_landmarks": face_landmarks,
                "option_data": option_data,
            },
            "user_flow":{
                "browser_name": browser_name,
                "retailer": retailer,
                "store_location": store_location,
                "clarity_id": clarity_id,
                "result_page_timestamp": result_page_timestamp,
            },
            "recommendations": recommendation_results,
            "recommendation_focus": {}
        }
        summary_data = {
            "client_id": client_id,
            "features": {
                "colors_lab": {"1": {"L": colors_lab[0][0], "a": colors_lab[0][1], "b": colors_lab[0][2]},
                               "2": {"L": colors_lab[1][0], "a": colors_lab[1][1], "b": colors_lab[1][2]},
                               "3": {"L": colors_lab[2][0], "a": colors_lab[2][1], "b": colors_lab[2][2]}},
                "colors_hex": {"1": colors_hex[0], "2": colors_hex[1], "3": colors_hex[2]},
                "color_avg_lab": {"L": color_avg_lab[0], "a": color_avg_lab[1], "b": color_avg_lab[2]},
                "color_avg_hex": color_avg_hex,
            },
            "user_flow":{
                "browser_name": browser_name,
                "retailer": retailer,
                "store_location": store_location,
                "clarity_id": clarity_id,
                "result_page_timestamp": result_page_timestamp,
            },
            "recommendation_focus": {},
        }
        print(f"Saving new client {client_id} to summary index {self.summary_pointer()}")
        print(f"Summary: {summary_data}")
        
        # Ensure the summary index exists
        summary_index = self.summary_pointer()
        if summary_index not in self.summary:
            self.create_summary_doc(summary_index)
        
        self.clients_summary_collection.document(str(summary_index)).set({client_id: summary_data}, merge=True)
        self.clients_collection.document(client_id).set(data)
        self.summary[summary_index][client_id] = summary_data

    def get_client_features(self, client_id: str) -> Dict[str, Any]:
        # Get client features
        # 1 firestore read
        doc = self.clients_collection.document(client_id).get()
        if doc.exists:
            return doc.to_dict().get("features", {})
        else:
            raise ValueError("Client ID not found")
        
    def get_client_skin_tone(self, client_id: str) -> Dict[str, Any]:
        # Get client skin tone (average color)
        # 1 firestore read
        features = self.get_client_features(client_id)
        color_dic = features.get("color_avg_lab", {})
        return [color_dic.get("L", 0), color_dic.get("a", 0), color_dic.get("b", 0)]
    
    def get_client_all_skin_data(self, client_id: str) -> Dict[str, Any]:
        # Get all client skin data (colors_lab)
        # 1 firestore read
        features = self.get_client_features(client_id)
        return features.get("colors_lab", {})

    
    def get_client_option_data(self, client_id: str) -> Dict[str, Any]:
        # Get client option data (answers to questions)
        # 1 firestore read
        features = self.get_client_features(client_id)
        option_data = features.get("option_data", {})
        return option_data
        
    def phone_page_update(self, client_id: str, phone_page_timestamp: str):
        # Update phone page timestamp
        # 2 firestore writes
        field_name = "phone_page_results_timestamp"
        self.clients_collection.document(client_id).update({
            f"user_flow.{field_name}": phone_page_timestamp
        })
        self.clients_summary_collection.document(str(self.find_summary_index(client_id))).update({f"{client_id}.user_flow.{field_name}": phone_page_timestamp})
        self.summary[self.find_summary_index(client_id)][client_id]["user_flow"][field_name] = phone_page_timestamp

    def focus_update(self, 
                     client_id: str, 
                     filters: List[str], 
                     final_recommendations: List[Dict[str, Any]]):
        
        # Update recommendation focus
        # 2 firestore writes
        
        self.clients_collection.document(client_id).update({
            "recommendation_focus": {
                "filters": filters,
                "final_recommendations": final_recommendations
            }
        })
        self.clients_summary_collection.document(str(self.find_summary_index(client_id))).update({
            f"{client_id}.recommendation_focus": {
                "filters": filters,
                "final_recommendations": final_recommendations
            }
        })
        self.summary[self.find_summary_index(client_id)][client_id]["recommendation_focus"] = {
            "filters": filters,
            "final_recommendations": final_recommendations
        }

    def exit_update(self, client_id: str, exit_timestamp: str, filters: List[str], 
                 final_recommendations: List[Dict[str, Any]]):
        # Update exit timestamp and recommendation focus
        # 2 firestore writes
        
        # Prepare the update data for both exit timestamp and recommendation focus
        main_update_data = {
            "user_flow.exit_timestamp": exit_timestamp,
            "recommendation_focus": {
                "filters": filters,
                "final_recommendations": final_recommendations
            }
        }
        
        # For summary updates, we need to use bracket notation for client_id with hyphens
        summary_update_data = {
            f"`{client_id}`.user_flow.exit_timestamp": exit_timestamp,
            f"`{client_id}`.recommendation_focus": {
                "filters": filters,
                "final_recommendations": final_recommendations
            }
        }
        
        # Write 1: Update main client document
        self.clients_collection.document(client_id).update(main_update_data)
        
        # Write 2: Update summary document using set with merge=True instead of update
        summary_index = self.find_summary_index(client_id)
        
        # Use set with merge=True to avoid field path issues
        nested_update = {
            client_id: {
                "user_flow": {
                    "exit_timestamp": exit_timestamp
                },
                "recommendation_focus": {
                    "filters": filters,
                    "final_recommendations": final_recommendations
                }
            }
        }
        
        self.clients_summary_collection.document(str(summary_index)).set(nested_update, merge=True)
        
        # Update local cache
        if summary_index in self.summary:
            if client_id in self.summary[summary_index]:
                self.summary[summary_index][client_id]["user_flow"]["exit_timestamp"] = exit_timestamp
                self.summary[summary_index][client_id]["recommendation_focus"] = {
                    "filters": filters,
                    "final_recommendations": final_recommendations
                }

    def save_feedback(self, client_id: str, rating: int, improvements: list, opinions: str):
        # Save feedback
        # 2 firestore writes
        feedback_data = {
            "feedback_timestamp":  datetime.now().isoformat(),
            "rating": rating,
            "improvements": improvements,
            "opinions": opinions,
        }
        self.clients_collection.document(client_id).update({
            "feedback": feedback_data
        })
        self.clients_summary_collection.document(str(self.find_summary_index(client_id))).update({
            f"{client_id}.feedback": feedback_data
        })
        if self.find_summary_index(client_id) in self.summary:
            if client_id in self.summary[self.find_summary_index(client_id)]:
                self.summary[self.find_summary_index(client_id)][client_id]["feedback"] = feedback_data

    def get_client(self, client_id: str) -> Dict[str, Any]:
        # Get full client data
        # 1 firestore read
        doc = self.clients_collection.document(client_id).get()
        if doc.exists:
            return doc.to_dict()
        else:
            raise ValueError("Client ID not found")

    def get_client_with_product_details(self, client_id: str, products_db: Any) -> Dict[str, Any]:
        client_data = self.get_client(client_id)
        recommended_products = client_data.get("recommendations", [])
        for product in recommended_products:
            gtin = product.get("product_id")
            product_details = products_db.get_product_by_gtin("dm",gtin)
            if product_details:
                product["color_lab"] = product_details.get("color_lab", {})
                product["color_hex"] = product_details.get("color_hex", "")
                product["rescanned"] = len(product_details.get("changes", [])) > 1
                product["changes"] = product_details.get("changes", [])
        return client_data


    def generate_summary_table(self):
        joined_summary = {}
        for index, clients in self.summary.items():
            joined_summary.update(clients)

        table = []

        for user_id, user_data in joined_summary.items():
            try:
                # Helper function to safely get nested values
                def safe_get(data, *keys, default=""):
                    current = data
                    try:
                        for key in keys:
                            current = current[key]
                        return current
                    except (KeyError, IndexError, TypeError):
                        return default
                    
                def safe_get_final_recommendation_gtin(data, index=0, default=""):
                    try:
                        f_r = safe_get(user_data, "recommendation_focus", "final_recommendations", default={})
                        if not f_r:
                            return default
                        try:
                            return f_r[index].get("gtin", default)
                        except (IndexError, AttributeError):
                            return default
                    except (IndexError, AttributeError):
                        return default
                    
                def safe_get_final_recommendation_name(data, index=0, default=""):
                    try:
                        f_r = safe_get(user_data, "recommendation_focus", "final_recommendations", default={})
                        if not f_r:
                            return default
                        try:
                            brand = f_r[index].get("brand", "")
                            description = f_r[index].get("description", "")
                            return f"{brand} {description}".strip()
                        except (IndexError, AttributeError):
                            return default
                    except (IndexError, AttributeError):
                        return default
                    
                    

                row = {
                    "client_id": safe_get(user_data, "client_id", default=user_id),
                    "features.colors_lab.1.L": safe_get(user_data, "features", "colors_lab", "1", "L"),
                    "features.colors_lab.1.a": safe_get(user_data, "features", "colors_lab", "1", "a"),
                    "features.colors_lab.1.b": safe_get(user_data, "features", "colors_lab", "1", "b"),
                    "features.colors_lab.2.L": safe_get(user_data, "features", "colors_lab", "2", "L"),
                    "features.colors_lab.2.a": safe_get(user_data, "features", "colors_lab", "2", "a"),
                    "features.colors_lab.2.b": safe_get(user_data, "features", "colors_lab", "2", "b"),
                    "features.colors_lab.3.L": safe_get(user_data, "features", "colors_lab", "3", "L"),
                    "features.colors_lab.3.a": safe_get(user_data, "features", "colors_lab", "3", "a"),
                    "features.colors_lab.3.b": safe_get(user_data, "features", "colors_lab", "3", "b"),
                    "features.colors_hex.1": safe_get(user_data, "features", "colors_hex", "1"),
                    "features.colors_hex.2": safe_get(user_data, "features", "colors_hex", "2"),
                    "features.colors_hex.3": safe_get(user_data, "features", "colors_hex", "3"),
                    "features.color_avg_lab.L": safe_get(user_data, "features", "color_avg_lab", "L"),
                    "features.color_avg_lab.a": safe_get(user_data, "features", "color_avg_lab", "a"),
                    "features.color_avg_lab.b": safe_get(user_data, "features", "color_avg_lab", "b"),
                    "features.color_avg_hex": safe_get(user_data, "features", "color_avg_hex"),
                    "user_flow.browser_name": safe_get(user_data, "user_flow", "browser_name"),
                    "user_flow.retailer": safe_get(user_data, "user_flow", "retailer"),
                    "user_flow.store_location": safe_get(user_data, "user_flow", "store_location"),
                    "user_flow.clarity_id": safe_get(user_data, "user_flow", "clarity_id"),
                    "user_flow.result_page_timestamp": safe_get(user_data, "user_flow", "result_page_timestamp"),
                    "user_flow.phone_page_results_timestamp": safe_get(user_data, "user_flow", "phone_page_results_timestamp"),
                    "user_flow.exit_timestamp": safe_get(user_data, "user_flow", "exit_timestamp"),
                    "recommendation_focus.filters": safe_get(user_data, "recommendation_focus", "filters", default={}),
                    "recommendation_focus.final_recommendations.1.gtin": safe_get_final_recommendation_gtin(user_data, index=0),
                    "recommendation_focus.final_recommendations.1.name": safe_get_final_recommendation_name(user_data, index=0),
                    "recommendation_focus.final_recommendations.2.gtin": safe_get_final_recommendation_gtin(user_data, index=1),
                    "recommendation_focus.final_recommendations.2.name": safe_get_final_recommendation_name(user_data, index=1),
                    "recommendation_focus.final_recommendations.3.gtin": safe_get_final_recommendation_gtin(user_data, index=2),
                    "recommendation_focus.final_recommendations.3.name": safe_get_final_recommendation_name(user_data, index=2),
                    "recommendation_focus.final_recommendations": safe_get(user_data, "recommendation_focus", "final_recommendations", default={}),
                    "feedback.feedback_timestamp": safe_get(user_data, "feedback", "feedback_timestamp"),
                    "feedback.rating": safe_get(user_data, "feedback", "rating"),
                    "feedback.improvements": safe_get(user_data, "feedback", "improvements", default=[]),
                    "feedback.opinions": safe_get(user_data, "feedback", "opinions", default=""),
                }
                table.append(row)
                # Sort table by "user_flow.result_page_timestamp" (descending, bigger string first)
                table.sort(key=lambda x: str(x.get("user_flow.result_page_timestamp", "")), reverse=True)
            except Exception as e:
                print(f"Error processing client {user_id}: {type(e).__name__}: {str(e)}")
                # Add a minimal row with just the client_id to avoid losing the record completely
                table.append({"client_id": user_id, "error": f"Error processing data: {str(e)}"})

        return table

    def generate_csv_stream(self) -> str:
        """
        Generate CSV content as a string for streaming download.
        Uses the data from generate_summary_table function.
        Returns the CSV content that can be used with StreamingResponse.
        """
        # Get the table data from the existing method
        table = self.generate_summary_table()
        
        if not table:
            raise ValueError("No client data available")
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Get column names from the first row (all rows should have same keys)
        if table:
            column_names = list(table[0].keys())
            
            # Write header row
            writer.writerow(column_names)
            
            # Write data rows
            for row_data in table:
                row = [row_data.get(col, "") for col in column_names]
                writer.writerow(row)
        
        # Return CSV content as string
        output.seek(0)
        csv_content = output.getvalue()
        
        print(f"CSV generated with {len(table)} clients and {len(column_names) if table else 0} columns")
        
        return csv_content

