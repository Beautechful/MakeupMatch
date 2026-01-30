"""
Updated Foundation Matching Service using Firestore

This service provides makeup product matching functionality using Firestore
as the data source with fallback to local files during transition.
"""

import json
import math
from pathlib import Path
from typing import List, Dict, Any, Optional

from .bundle_matching_service import bundle_service
from .firestore_product_service import FirestoreProductService
from .color_tools import distance_between_colors

# Import availability functions
try:
    from database.dm.parse import availability_instore as availability_instore_dm
    from database.dm.parse import fetch_products_data as fetch_products_data_dm

    from database.Douglas.parse import availability_instore as availability_instore_douglas
except ImportError:
    print("Warning: ERP availability modules not found. Stock info will be unavailable.")
    availability_instore_dm = None
    availability_instore_douglas = None


class FoundationMatchingService:
    """
    Enhanced foundation matching service with Firestore integration.
    
    Features:
    - Firestore-first data access with local fallback
    - Color-based product matching
    - Store availability integration
    - Product type filtering
    - Caching for performance
    """
    
    def __init__(self, 
                 firestore_service: FirestoreProductService = None,
                 use_firestore: bool = True,
                 cache_products: bool = True):
        """
        Initialize the foundation matching service.
        
        Args:
            firestore_service: Firestore product service instance
            use_firestore: Whether to use Firestore or local files
            cache_products: Whether to cache products in RAM
        """
        self.firestore_service = firestore_service
        self.use_firestore = use_firestore
        self.cache_products = cache_products
        
        # Cache for products
        self._product_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_timestamp: Optional[str] = None
        
        # Store brands available
        self.brand_list = ['dm', 'douglas']
        
        # Initialize data structure for backward compatibility
        self.data = {}
        
        print(f"Foundation matching service initialized with Firestore: {use_firestore}")
    
    def _get_products_from_firestore(self, store_brand: str) -> List[Dict[str, Any]]:
        """
        Get products from Firestore for a specific store brand.
        
        Args:
            store_brand: Store brand identifier
            
        Returns:
            List of product dictionaries
        """
        if not self.firestore_service:
            return []
        
        try:
            products = self.firestore_service.get_products_by_store(store_brand)
            return products
        except Exception as e:
            print(f"Error getting products from Firestore for {store_brand}: {e}")
            return []
    
    def _get_products_from_local(self, store_brand: str) -> List[Dict[str, Any]]:
        """
        Get products from local JSON files (fallback method).
        
        Args:
            store_brand: Store brand identifier
            
        Returns:
            List of product dictionaries
        """
        try:
            if store_brand == 'dm':
                return self._load_dm_products()
            elif store_brand in ['douglas', 'Douglas']:
                return self._load_douglas_products()
            else:
                return []
        except Exception as e:
            print(f"Error loading local products for {store_brand}: {e}")
            return []
    
    def _load_dm_products(self) -> List[Dict[str, Any]]:
        """Load DM products from local JSON files."""
        database = []
        
        folder_path = Path(__file__).resolve().parent.parent / 'database' / 'dm' / 'products'
        folder = Path(folder_path)
        
        if not folder.exists():
            return database
        
        file_list = [f for f in folder.glob('*.json') if f.is_file()]
        
        for file_path in file_list:
            type_name = file_path.name.split('.')[0]
            
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    data = json.load(file)
                
                for product in data:
                    if 'color_hex' not in product:
                        continue
                    
                    product_data = {
                        'gtin': product.get('gtin'),
                        'dan': product.get('dan'),
                        'type': type_name,
                        'brand': product.get('brand'),
                        'product_line': product.get('product_line', ''),
                        'title': product.get('title'),
                        'color_hex': product.get('color_hex'),
                        'color_lab': product.get('color_lab', []),
                        'store_brand': 'dm',  # For backward compatibility
                        'price': product.get('price'),
                        'product_link': product.get('product_link'),
                        'image_path': product.get('image_path'),
                    }
                    database.append(product_data)
                    
            except Exception as e:
                print(f"Error loading file {file_path}: {e}")
        
        return database
    
    def _load_douglas_products(self) -> List[Dict[str, Any]]:
        """Load Douglas products from local JSON files."""
        database = []
        
        try:
            # Load foundation metadata
            foundation_meta_path = Path(__file__).resolve().parent.parent / 'database' / 'foundation_Douglas.json'
            
            if not foundation_meta_path.exists():
                return database
            
            with open(foundation_meta_path, 'r', encoding='utf-8') as file:
                foundation_meta = json.load(file)
            
            for product_line in foundation_meta:
                path = product_line['path'].split('database/')[-1]
                product_file_path = Path(__file__).resolve().parent.parent / 'database' / path
                
                if not product_file_path.exists():
                    continue
                
                try:
                    with open(product_file_path, 'r', encoding='utf-8') as file:
                        product_line_data = json.load(file)
                    
                    for product in product_line_data:
                        product_data = {
                            'code': product.get('code'),
                            'type': 'foundation',
                            'brand': product_line.get('brand'),
                            'product_line': product_line.get('product'),
                            'title': product.get('title'),
                            'color_hex': product.get('color_hex'),
                            'color_lab': product.get('color_lab', []),
                            'store_brand': 'Douglas',  # For backward compatibility
                            'price': product_line.get('price'),
                            'product_link': product.get('product_link'),
                            'image_path': product.get('image_path'),
                        }
                        database.append(product_data)
                        
                except Exception as e:
                    print(f"Error loading Douglas product file {product_file_path}: {e}")
        
        except Exception as e:
            print(f"Error loading Douglas products: {e}")
        
        return database
    
    def get_product_by_gtin(self, store_brand: str, gtin: str) -> Optional[Dict[str, Any]]:
        """
        Get a product by its GTIN from Firestore or local files.
        
        Args:
            store_brand: Store brand identifier
            gtin: Product GTIN
        Returns:
            Product dictionary or None if not found
        """
        products = self.get_products(store_brand, use_cache=True)
        for product in products:
            if str(product.get('gtin', "")) == str(gtin) or product.get('code', "") == gtin:
                try:
                    refereshed_list = self._add_data_source_info([product], store_brand)
                    refereshed_list = self._add_availability_info(refereshed_list, store_brand)
                    return refereshed_list[0] if refereshed_list else product
                except Exception as e:
                    print(f"Error refreshing product data: {e}")
                    return product
        return None
    
    def get_products(self, store_brand: str, use_cache: bool = True) -> List[Dict[str, Any]]:
        """
        Get products for a store brand with caching.
        
        Args:
            store_brand: Store brand identifier
            use_cache: Whether to use cached data
            
        Returns:
            List of product dictionaries
        """
        cache_key = f"{store_brand}_products"
        
        # Check cache first
        if use_cache and cache_key in self._product_cache:
            return self._product_cache[cache_key]
        
        # Get products from Firestore or local files
        if self.use_firestore:
            products = self._get_products_from_firestore(store_brand)
            
            # Fallback to local if Firestore fails
            if not products:
                print(f"Firestore returned no products for {store_brand}, falling back to local files")
                products = self._get_products_from_local(store_brand)
        else:
            products = self._get_products_from_local(store_brand)
        
        # Cache the results
        if self.cache_products:
            self._product_cache[cache_key] = products
        
        return products
    
    def get_product_types(self, store_brand: str) -> List[str]:
        """
        Get available product types for a store brand.
        
        Args:
            store_brand: Store brand identifier
            
        Returns:
            List of product type names
        """
        if self.use_firestore and self.firestore_service:
            return self.firestore_service.get_product_types(store_brand)
        
        # Fallback to local data
        products = self.get_products(store_brand)
        types = set()
        for product in products:
            if 'type' in product:
                types.add(product['type'])
        
        return sorted(list(types))
    
    def update_center_color(self, products):
        sum_L = 0
        sum_a = 0
        sum_b = 0
        count = 0
        for product in products:
            if 'color_lab' in product and product['color_lab']:
                if 'changes' in product and product['changes']:
                    if len(product['changes'].keys()) > 1:
                        try:
                            sum_L += product['color_lab'][0]
                            sum_a += product['color_lab'][1]
                            sum_b += product['color_lab'][2]
                            count += 1
                        except Exception as e:
                            print(f"Error calculating center color for product: {e}")
        if count > 0:
            self.center_L = sum_L / count
            self.center_a = sum_a / count
            self.center_b = sum_b / count
        else:
            self.center_L = 50
            self.center_a = 0
            self.center_b = 0

    def color_correction(self, color_lab: List[float]) -> List[float]:
        L = color_lab[0]
        a = color_lab[1]
        b = color_lab[2]

        scale_x = 0.8
        scale_y = 0.6
        scale_z = 0.6
        offset_x = -10
        offset_y = -4
        offset_z = -7
        rotation_x = 0
        rotation_y = 10
        rotation_z = -25

        # 1. Scale relative to center
        L = self.center_L + (L - self.center_L) * scale_x
        a = self.center_a + (a - self.center_a) * scale_y
        b = self.center_b + (b - self.center_b) * scale_z

        # 2. Apply rotation (simplified - around center)
        rot_x = (rotation_x * math.pi) / 180
        rot_y = (rotation_y * math.pi) / 180
        rot_z = (rotation_z * math.pi) / 180
        # Translate to origin for rotation
        x = L - self.center_L
        y = a - self.center_a
        z = b - self.center_b   
        # Apply rotations (simplified 3D rotation)
        if rot_x != 0:
            newY = y * math.cos(rot_x) - z * math.sin(rot_x)
            newZ = y * math.sin(rot_x) + z * math.cos(rot_x)
            y = newY
            z = newZ
        if rot_y != 0:
            newX = x * math.cos(rot_y) + z * math.sin(rot_y)
            newZ = -x * math.sin(rot_y) + z * math.cos(rot_y)
            x = newX
            z = newZ
        if rot_z != 0:
            newX = x * math.cos(rot_z) - y * math.sin(rot_z)
            newY = x * math.sin(rot_z) + y * math.cos(rot_z)
            x = newX
            y = newY
        # Translate back and add translation offset
        L = x + self.center_L + offset_x
        a = y + self.center_a + offset_y
        b = z + self.center_b + offset_z

        return [L, a, b]

    def compute_average_color(self, color_points_: List[List[float]]) -> List[float]:
        color_points = color_points_.copy()
        if not color_points:
            return [0, 0, 0]

        max_distance = 5.0
        avg_L = sum(point[0] for point in color_points) / len(color_points)
        avg_a = sum(point[1] for point in color_points) / len(color_points)
        avg_b = sum(point[2] for point in color_points) / len(color_points)

        furthest_point = max(color_points, key=lambda point: distance_between_colors(point, [avg_L, avg_a, avg_b]), default=None)
        if distance_between_colors(furthest_point, [avg_L, avg_a, avg_b]) < max_distance:
            return [avg_L, avg_a, avg_b]
        
        # Remove furthest point and recompute average
        color_points.remove(furthest_point)
        return self.compute_average_color(color_points)


    def match_foundation(self,
                        target_color: List[float],
                        store_brand: str,
                        store_location: str = None,
                        length: int = 5,
                        product_type: str = None,
                        include_availability: bool = True,
                        include_scanning_history: bool = False,
                        only_rescanned: bool = True) -> List[Dict[str, Any]]:
        """
        Match foundation products by color similarity.
        
        Args:
            target_color: Target color in LAB format [L, a, b]
            store_brand: Store brand to search in
            store_location: Store location for availability check
            length: Maximum number of results
            product_type: Optional product type filter
            include_availability: Whether to include availability information
            
        Returns:
            List of matched products with similarity scores
        """
        if store_brand not in self.brand_list:
            raise ValueError(f"Invalid store brand: {store_brand}. Choose from {self.brand_list}.")
        
        # Get products
        products = self.get_products(store_brand)
        
        # Filter by product type if specified
        if product_type:
            products = [p for p in products if p.get('type') == product_type]
        
        # Filter products with color information
        products_with_color = []
        self.update_center_color(products)
        for product in products:
            if 'color_lab' in product and product['color_lab']:
                if 'changes' in product and product['changes']:
                    if not only_rescanned or (only_rescanned and len(product['changes'].keys()) > 1):
                        try:
                            product_copy = product.copy()  # Avoid modifying original
                            corrected_color = self.color_correction(product['color_lab'])
                            product_copy['corrected_color_lab'] = corrected_color
                            distance = distance_between_colors(target_color, corrected_color)
                            product_copy['color_distance'] = distance
                            products_with_color.append(product_copy)
                        except Exception as e:
                            print(f"Error calculating color distance for product: {e}")
        
        # Sort by color distance and limit results
        sorted_products = sorted(products_with_color, key=lambda x: x['color_distance'])[:length]
        
        # Add availability information
        if include_availability:
            sorted_products = self._add_availability_info(sorted_products, store_brand, store_location)
        sorted_products = self._add_data_source_info(sorted_products, store_brand)
        # Format results for frontend
        formatted_results = self._format_results(sorted_products, target_color, include_scanning_history)
        
        return formatted_results

    def _add_data_source_info(self, products: List[Dict[str, Any]], store_brand: str) -> List[Dict[str, Any]]:
        """
        Add data source information to products.
        """
        if store_brand == 'dm':
            dans_list = []
            for product in products:
                if 'dan' in product and product['dan']:
                    dans_list.append(str(product['dan']))
            fetched_data = fetch_products_data_dm(dans_list, fetch_brand=True, fetch_image=True, fetch_description=True, fetch_prices=True) if fetch_products_data_dm else {}
            for product in products:
                dan_str = str(product.get('dan', ''))
                if dan_str in fetched_data:
                    product.update(fetched_data[dan_str])        
        
        return products

    def _add_availability_info(self, products: List[Dict[str, Any]], 
                             store_brand: str, store_location: str = None) -> List[Dict[str, Any]]:
        """
        Add availability information to products.
        
        Args:
            products: List of product dictionaries
            store_brand: Store brand identifier
            store_location: Store location for availability check
            
        Returns:
            List of products with availability information
        """
        try:
            if store_brand == 'dm' and availability_instore_dm:
                dan_list = [str(product.get('dan', '')) for product in products 
                           if 'dan' in product and product['dan']]
                
                if dan_list:
                    if store_location:
                        availability = availability_instore_dm(dan_list, store=store_location)
                    else:
                        availability = availability_instore_dm(dan_list)
                    
                    for product in products:
                        dan_str = str(product.get('dan', ''))
                        if dan_str in availability:
                            product['erp_connection'] = True
                            product['online_status'] = availability[dan_str].get('online_status', False)
                            product['instore_status'] = availability[dan_str].get('instore_status', False)
                            product['stock_level'] = availability[dan_str].get('stock_level', 0)
                            # availability field for backward compatibility
                            # 'available' | 'online' | 'unavailable' | 'unknown'
                            if product['instore_status']:
                                product['availability'] = 'available'
                            elif product['online_status']:
                                product['availability'] = 'online'
                            elif not product['instore_status'] and not product['online_status']:
                                product['availability'] = 'unavailable'
                            else:
                                product['availability'] = 'unknown'
                        else:
                            product['erp_connection'] = False
                            product['online_status'] = False
                            product['instore_status'] = False
                            product['stock_level'] = 0
                            product['availability'] = 'unknown'
            
            elif store_brand in ['douglas', 'Douglas'] and availability_instore_douglas:
                ids = [product.get('code', '') for product in products 
                      if 'code' in product and product['code']]
                
                if ids:
                    if store_location:
                        availability = availability_instore_douglas(ids, store=store_location)
                    else:
                        availability = availability_instore_douglas(ids)
                    
                    for product in products:
                        code = product.get('code', '')
                        if code in availability:
                            product['erp_connection'] = True
                            product['online_status'] = availability[code].get('online_status', False)
                            product['instore_status'] = availability[code].get('instore_status', False)
                        else:
                            product['erp_connection'] = False
                            product['online_status'] = False
                            product['instore_status'] = False
        
        except Exception as e:
            print(f"Error adding availability info: {e}")
            # Set default values if availability check fails
            for product in products:
                product['erp_connection'] = False
                product['online_status'] = False
                product['instore_status'] = False
                product['stock_level'] = 0
        
        return products
    
    def _format_results(self, products: List[Dict[str, Any]], 
                       target_color: List[float], include_scanning_history: bool = False) -> List[Dict[str, Any]]:
        """
        Format products for frontend consumption.
        
        Args:
            products: List of product dictionaries
            target_color: Target color for match percentage calculation
            
        Returns:
            List of formatted product dictionaries
        """
        formatted_products = []
        
        for product in products:
            try:
                # Calculate match percentage
                distance = product.get('color_distance', float('inf'))
                threshold = 50  # 0% match if distance > 50
                percentage_match = max(0, 1 - (min(distance, threshold) / threshold))
                match_percentage = f"{round(percentage_match * 100)}%"
                if product.get('image', '') != '':
                    image_path = product.get('image', '')
                else:
                    image_path = product.get('image_path', '')
                # Format product data
                formatted_product = {
                    'product_id': product.get('product_id', ''),
                    'product_brand_name': product.get('brand', ''),
                    'product_description': f"{product.get('title', '')} {product.get('product_line', '')}".strip(),
                    'product_color_swatch': product.get('color_hex', ''),
                    'product_image': image_path,
                    'product_link': product.get('product_link', ''),
                    'price': f"{product.get('price', 0)} €" if isinstance(product.get('price'), (int, float)) else str(product.get('price', '')),
                    'type': product.get('type', ''),
                    'match_percentage': match_percentage,
                    'color_distance': distance,
                    'erp_connection': product.get('erp_connection', False),
                    'instore_status': product.get('instore_status', False),
                    'online_status': product.get('online_status', False),
                    'stock_level': product.get('stock_level', 0),
                    'store_brand': product.get('store_brand', ''),
                    'features': product.get('features', {}),
                    'ingredients': product.get('ingredients', "")
                }
                if include_scanning_history:
                    formatted_product['color_lab'] = product.get('color_lab', [])
                    formatted_product['color_hex'] = product.get('color_hex', "")
                    formatted_product['corrected_color_lab'] = product.get('corrected_color_lab', [])
                    history = {}
                    for time, event in product.get('changes', {}).items():
                        if len(event.keys()) == 1:
                            event = event[list(event.keys())[0]]
                        if len(event.keys()) > 1 and 'fields' in event:
                            fields = event['fields']
                            if 'color_lab' in fields and 'color_hex' in fields:
                                history[time] = {
                                    'color_hex': fields['color_hex'].get('old', ""),
                                    'color_lab': fields['color_lab'].get('old', [])
                                }
                                
                            
                    formatted_product['history'] = history

                formatted_products.append(formatted_product)
                
            except Exception as e:
                print(f"Error formatting product: {e}")
        
        return formatted_products
    
    def clear_cache(self):
        """Clear the product cache."""
        self._product_cache.clear()
        self._cache_timestamp = None
        print("Product cache cleared")
    
    def get_cache_info(self) -> Dict[str, Any]:
        """Get information about the current cache."""
        return {
            'cache_size': len(self._product_cache),
            'cached_stores': list(self._product_cache.keys()),
            'cache_timestamp': self._cache_timestamp
        }
    
    def classify_skin_tone(self, cie_lab: List[float]) -> str:
        """
        Classify skin tone based on CIE LAB color.
        
        Args:
            cie_lab: Color in CIE LAB format [L, a, b]
            
        Returns:
            Skin tone classification as a string
        """

        classes = {
            "very-light": [66.8, 5.9, 11.1],
            "light": [60.6, 9.4, 15.1],
            "medium": [56.7, 11.4, 17.9],
            "tan": [49.3, 13.5, 19.4],
            "olive": [55.9, 7.5, 18.1],
            "dark": [37.9, 13.7, 22.6]
        }
        
        min_distance = float('inf')
        best_class = "other"
        for class_name, class_color in classes.items():
            distance = distance_between_colors(cie_lab, class_color)
            if distance < min_distance:
                min_distance = distance
                best_class = class_name

        return best_class

    def bundle_match(self, hair_color: str, skin_color: list, skin_type: str, retail = 'dm', store_id ='D522') -> dict:
        skin_color_type = self.classify_skin_tone(skin_color)
        bundle = bundle_service(hair_color, skin_color_type, skin_type)
        self._add_availability_info(bundle, retail, store_id)
        self._add_data_source_info(bundle, retail)
        return bundle