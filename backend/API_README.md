# MakeupMatch Foundation Backend API

This document describes the available API endpoints for the MakeupMatch foundation backend server (`backend/server.py`). The backend provides endpoints for client management, product matching, and store/product data retrieval.

## Base URL

```
http://<host>:<port>/
```

---

## Endpoints

### 1. `POST /get_results`
**Description:**
Processes a user session, including answers, scanned color data, and a photo. Returns matched foundation products and user info.

**Request Body:**
- JSON object with keys:
  - `answers`: List of answer blocks. Each block is a dictionary with at least a `type` key. Two important types:
    - `{"type": "camera", "image": "data:image/png;base64,..."}`: Contains a base64-encoded PNG image string.
    - `{"type": "scan", "scanResult": [[L, a, b], ...]}`: Contains a list of CIELAB color values (each as a list of 3 floats).
  - `config`: Dictionary with configuration, must include:
    - `store_name`: String, the store brand to match against.
    - `store_location`: String, the store location.

**Example Request:**
```json
{
  "answers": [
    {"type": "camera", "image": "data:image/png;base64,iVBORw0KGgo..."},
    {"type": "scan", "scanResult": [[70.1, 15.2, 20.3], [68.5, 14.8, 19.9]]}
  ],
  "config": {"store_name": "Douglas", "store_location": "Berlin"}
}
```

**Response:**
- `200 OK`: 
  ```json
  {
    "user_id": "...", // Unique session/user ID
    "timestamp": "...", // ISO timestamp
    "client": {"color": "#AABBCC"},
    "filters": [
      {
        "property_name": "property1_name",
        "options": {
          "option1": true,                            // Name of first option and default state
          "option2": true,                            // Name of second option and default state
          "option3": false,                            // Name of third option and default state
          ...
        }
      },
      ...
    ]
    "products": [
      {
        "product_brand_name": "string",               // Brand name
        "product_description": "string",              // Product name
        "product_color_swatch": "hex_string",         // HEX color value
        "type": "string",                             // Product type (e.g., foundation, concealer)
        "price": "string",                            // Price (string)
        "match_percentage": "string",                     // Matching rate 0-100%
        "product_image": "string",                    // Product online store URL
        "product_link": "string",                     // Product image URL
        "erp_connection": true,                       // Connection to the enterprise resource planning. If it is false, next fields (instore_status, online_status, stock_level) won't be provided 
        "instore_status": true,                       // [if erp_connection is true] Availability in store (bool)
        "online_status": true,                        // [if erp_connection is true] Availability in online store (bool
        "stock_level": 4,                             // [if erp_connection is true] Amount of products available in the store (int)
        "properties":{                                // Properties of this product related to the filter information
          "property1_name": ["option1", "option2"],   // Values of property1 related to this product
          "property2_name": ["option1", "option2"]    // Values of property2 related to this product
        }
        ... // Other fields depending on the store's product database
      },
      // ... more products
    ],
  
  }

  **Example Product Object:**

  ```json

    "user_id": "92b3d9cc-44e5-458e-afe3-53e0b059362b", 
    "timestamp": "2025-05-19T23:16:28.046157", 
    "client": {"color": "#c4a995"},
    "filters": [
      {
        "property_name": "Coverage",
        "options": {
          "Low coverage": false,                            
          "Medium coverage": true,                            
          "High coverage": false,                            
        }
      },
      {
        "property_name": "Make-up Types",
        "options":{
          "BB-/CC-cream": false,
          "Concealer": true,
          "Foundation": true,
          "Highlighter": true,
          "Powder": true
        }
      },
      {
        "property_name": "Others",
        "options":{
          "Organic Brands": true,
          "Premium Brands": false
        }
      }
    ],
    "products": [
      {
        "product_brand_name": "Catrice",
        "product_description": "Foundation Invisible Cover 040N, 30 ml",
        "product_color_swatch": "#ab8773",
        "type": "foundation",
        "price": "6.95 €",
        "product_image": "https://media.dm-static.com/images/v1734447527/products/pim/4059729488824-1860769026/catrice-foundation-invisible-cover-040n",
        "product_link": "https://www.dm.de/catrice-foundation-invisible-cover-040n-p4059729488824.html",
        "erp_connection": true,
        "instore_status": true,
        "online_status": true,
        "stock_level": 4,
        "match_percentage": "94%",
        "properties":{                                
              "Coverage": ["Medium coverage"],   
              "Make-up Types": ["Foundation"],
              "Others": ["Organic Brands", "Premium Brands"]    
            }
      },
      ...
    ]
  ```
- `500 Internal Server Error`: Error message

---

### 2. `GET /get_history/{user_id}`
**Description:**
Retrieves the saved results for a specific user session by user ID.

**Path Parameter:**
- `user_id`: String, the unique user/session ID returned by `/get_results`.

**Response:**
- `200 OK`: JSON object with the same structure as the `/get_results` response for that user.
- `404 Not Found`: If user ID does not exist
- `500 Internal Server Error`: Error message

---

### 3. `GET /get_all_clients`
**Description:**
Returns metadata for all clients, including reduced-resolution images if available.

**Response:**
- `200 OK`: List of client metadata objects. Each object contains:
  - `client_id`: String
  - `timestamp`: String (ISO format)
  - `photo_path`: String (path to the client's photo on disk)
  - ...other metadata fields
- `500 Internal Server Error`: Error message

---

### 4. `GET /get_client/{client_id}`
**Description:**
Retrieves the full data for a specific client by client ID.

**Path Parameter:**
- `client_id`: String, the unique client ID.

**Response:**
- `200 OK`: JSON object with all stored data for the client (answers, feedback, etc.)
- `404 Not Found`: If client ID does not exist
- `500 Internal Server Error`: Error message

---

### 5. `POST /update_client`
**Description:**
Updates the data for a specific client.

**Request Body:**
- JSON object: `{ "client": { ... } }` where the value is the full client data object to update.

**Response:**
- `200 OK`: `{ "message": "Client updated successfully" }`
- `500 Internal Server Error`: Error message

---

### 6. `GET /store_brands`
**Description:**
Returns the list of available store brands.

**Response:**
- `200 OK`: Array of strings, each a store brand name.
- `500 Internal Server Error`: Error message

---

### 7. `GET /product-data/{store_brand}`
**Description:**
Returns the product database for a specific store brand.

**Path Parameter:**
- `store_brand`: String, the name of the store brand.

**Response:**
- `200 OK`: `{ "data": { ... } }` where the value is a dictionary of product data for the brand (see database/foundation_{store_brand}.json for structure)
- `404 Not Found`: If store brand not found or no data available
- `500 Internal Server Error`: Error message

---

## Notes
- All endpoints return JSON responses.
- CORS is enabled for all origins.
- Client and result data are stored in the `clients/` and `results/` directories, respectively.

## Running the Server

To start the backend server:

1. Activate your Python virtual environment:
   ```
   conda activate makeup-match
   # or: source venv/bin/activate
   ```
2. Run the server:
   ```
   uvicorn server:app --reload --host 0.0.0.0 --port 8001
   ```

---

For further details, see the source code in `backend/server.py`.
