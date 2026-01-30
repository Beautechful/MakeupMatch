"""
Firestore Product Service for Makeup Matching System

This service manages product data in Firestore with versioning and change tracking.
Provides methods for CRUD operations and product matching functionality.
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
from google.cloud import firestore
from google.oauth2 import service_account
from .color_tools import distance_between_colors


class FirestoreProductService:
    """
    Service class for managing products in Firestore with hybrid structure.
    
    Features:
    - Current state + change tracking
    - Efficient RAM loading for color matching
    - Store/brand filtering
    - Product type categorization
    - Intelligent caching to reduce Firestore reads
    """
    
    def __init__(self, 
                 service_account_path: Optional[str] = None,
                 project_id: str = None,
                 database_id: str = 'your-database-id',
                 collection_name: str = 'products'):
        """
        Initialize the Firestore product service.
        
        Args:
            service_account_path: Path to service account JSON file (None for default credentials)
            project_id: Google Cloud Project ID
            database_id: Firestore database ID
            collection_name: Collection name for products
        """
        self.project_id = project_id
        self.database_id = database_id
        self.collection_name = collection_name
        
        # Initialize caching
        self._cache = {}
        self._cache_timestamps = {}
        self._cache_ttl = 300  # 5 minutes cache TTL
        
        # Initialize Firestore client
        try:
            if service_account_path:
                # Use service account file (local development)
                cred = service_account.Credentials.from_service_account_file(service_account_path)
                self.db = firestore.Client(project=project_id, credentials=cred, database=database_id)
                print(f"Firestore client initialized with service account file: {service_account_path}")
            else:
                # Use default application credentials (GCP environment)
                self.db = firestore.Client(project=project_id, database=database_id)
                print(f"Firestore client initialized with default credentials")
            
            self.collection = self.db.collection(collection_name)
            print(f"Firestore client initialized successfully for project: {project_id}")
        except Exception as e:
            print(f"Error initializing Firestore client: {e}")
            raise
    
    def _get_cache_key(self, method_name: str, *args, **kwargs) -> str:
        """Generate cache key for method calls."""
        key_parts = [method_name]
        key_parts.extend(str(arg) for arg in args)
        key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
        return ":".join(key_parts)
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache entry is still valid."""
        if cache_key not in self._cache_timestamps:
            return False
        
        cache_time = self._cache_timestamps[cache_key]
        return datetime.now() - cache_time < timedelta(seconds=self._cache_ttl)
    
    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get value from cache if valid."""
        if self._is_cache_valid(cache_key):
            return self._cache.get(cache_key)
        return None
    
    def _set_cache(self, cache_key: str, value: Any) -> None:
        """Set value in cache."""
        self._cache[cache_key] = value
        self._cache_timestamps[cache_key] = datetime.now()
    
    def clear_cache(self) -> None:
        """Clear all cached data."""
        self._cache.clear()
        self._cache_timestamps.clear()
        print("Cache cleared")
    
    def create_product(self, product_id: str, product_data: Dict[str, Any], 
                      created_by: str = 'system') -> bool:
        """
        Creates a new product with initial data and change tracking.
        
        Args:
            product_id: Unique identifier for the product
            product_data: Dictionary containing product fields
            created_by: User/system that created the product
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            timestamp = datetime.utcnow().isoformat() + 'Z'
            
            # Prepare the document structure
            doc_data = {
                'current': {
                    **product_data,
                    'last_updated': timestamp
                },
                'changes': {
                    timestamp: {
                        'action': 'create',
                        'data': product_data,
                        'by': created_by
                    }
                },
                'metadata': {
                    'created_at': timestamp,
                    'version_count': 1,
                    'last_modified': timestamp
                }
            }
            
            self.collection.document(product_id).set(doc_data)
            print(f"Product '{product_id}' created successfully")
            return True
            
        except Exception as e:
            print(f"Error creating product '{product_id}': {e}")
            return False
    
    def update_product(self, product_id: str, updates: Dict[str, Any], 
                      updated_by: str = 'system') -> bool:
        """
        Updates product fields with change tracking.
        
        Args:
            product_id: Product identifier
            updates: Dictionary of field updates
            updated_by: User/system that updated the product
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            doc_ref = self.collection.document(product_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                print(f"Product '{product_id}' does not exist")
                return False
            
            current_data = doc.to_dict()
            old_current = current_data.get('current', {})
            timestamp = datetime.utcnow().isoformat().split('.')[0] + 'Z'
            
            # Track field changes
            field_changes = {}
            for field, new_value in updates.items():
                old_value = old_current.get(field)
                if old_value != new_value:
                    field_changes[field] = {
                        'old': old_value,
                        'new': new_value
                    }
            
            if not field_changes:
                print(f"No changes detected for product '{product_id}'")
                return True
            
            # Update current state
            new_current = {**old_current, **updates, 'last_updated': timestamp}
            
            # Add change record
            change_record = {
                'action': 'update',
                'fields': field_changes,
                'by': updated_by
            }
            
            # Update metadata
            metadata = current_data.get('metadata', {})
            metadata['version_count'] = metadata.get('version_count', 0) + 1
            metadata['last_modified'] = timestamp
            
            # Update document
            doc_ref.update({
                'current': new_current,
                f'changes.{timestamp}': change_record,
                'metadata': metadata
            })
            
            print(f"Product '{product_id}' updated successfully")
            return True
            
        except Exception as e:
            print(f"Error updating product '{product_id}': {e}")
            return False
    
    def get_product_current(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Gets the current state of a product.
        
        Args:
            product_id: Product identifier
            
        Returns:
            dict or None: Current product data or None if not found
        """
        try:
            # Check cache first
            cache_key = self._get_cache_key('get_product_current', product_id)
            cached_result = self._get_from_cache(cache_key)
            if cached_result is not None:
                print(f"Cache hit for product '{product_id}'")
                return cached_result
            
            doc = self.collection.document(product_id).get()
            if doc.exists:
                result = doc.to_dict().get('current')
                
                # Update cache
                self._set_cache(cache_key, result)
                return result
            
            return None
            
        except Exception as e:
            print(f"Error getting product '{product_id}': {e}")
            return None
    
    def get_products_by_store(self, store_brand: str) -> List[Dict[str, Any]]:
        """
        Gets all products available in a specific store brand.
        
        Args:
            store_brand: Store brand identifier (e.g., 'dm', 'douglas')
            
        Returns:
            List of product dictionaries
        """
        try:
            # Check cache first
            cache_key = self._get_cache_key('get_products_by_store', store_brand)
            cached_result = self._get_from_cache(cache_key)
            if cached_result is not None:
                print(f"Cache hit for store '{store_brand}'")
                return cached_result
            
            products = []
            docs = self.collection.where(f'current.retailers.{store_brand}', '>', {}).stream()
            
            for doc in docs:
                data = doc.to_dict()
                changes = data.get('changes', {})
                for timestamp, change in changes.items():
                    if change.get('action', "") == 'create':
                        changes[timestamp] = {} # Clear out create changes
                current = data.get('current')
                if current and 'retailers' in current and store_brand in current['retailers']:
                    # Merge general product info with store-specific info
                    product = current.copy()
                    store_info = current['retailers'][store_brand]
                    
                    # Add store-specific fields to the product
                    product.update(store_info)
                    product['store_brand'] = store_brand
                    product['product_id'] = doc.id
                    product['changes'] = changes
                    
                    products.append(product)
            
            # Update cache
            self._set_cache(cache_key, products)
            return products
            
        except Exception as e:
            print(f"Error getting products for store '{store_brand}': {e}")
            return []
    
    def get_products_by_type(self, product_type: str, store_brand: str = None) -> List[Dict[str, Any]]:
        """
        Gets products by type, optionally filtered by store brand.
        
        Args:
            product_type: Type of product (e.g., 'foundation', 'concealer')
            store_brand: Optional store brand filter
            
        Returns:
            List of product dictionaries
        """
        try:
            # Check cache first
            cache_key = self._get_cache_key('get_products_by_type', product_type, store_brand)
            cached_result = self._get_from_cache(cache_key)
            if cached_result is not None:
                print(f"Cache hit for product type '{product_type}'")
                return cached_result
            
            query = self.collection.where('current.type', '==', product_type)
            
            products = []
            docs = query.stream()
            
            for doc in docs:
                data = doc.to_dict()
                current = data.get('current')
                if current and 'retailers' in current:
                    # If store_brand is specified, only include products available in that store
                    if store_brand:
                        if store_brand in current['retailers']:
                            product = current.copy()
                            store_info = current['retailers'][store_brand]
                            product.update(store_info)
                            product['store_brand'] = store_brand
                            product['product_id'] = doc.id
                            products.append(product)
                    else:
                        # Return all products with all retailer information
                        product = current.copy()
                        product['product_id'] = doc.id
                        products.append(product)
            
            # Update cache
            self._set_cache(cache_key, products)
            return products
            
        except Exception as e:
            print(f"Error getting products by type '{product_type}': {e}")
            return []
    
    def load_all_products_to_ram(self, store_brand: str = None) -> Dict[str, Dict[str, Any]]:
        """
        Loads current product states into RAM for fast color matching.
        Only loads products that have color information and are available in the specified store.
        
        Args:
            store_brand: Optional filter by store brand
            
        Returns:
            dict: Dictionary mapping product_id -> current_state
        """
        try:
            products = {}
            
            if store_brand:
                # More efficient: only get products available in the specified store
                docs = self.collection.where(f'current.retailers.{store_brand}', '>', {}).stream()
                
                for doc in docs:
                    data = doc.to_dict()
                    current = data.get('current')
                    if current and 'color_lab' in current and current['color_lab']:
                        product = current.copy()
                        store_info = current['retailers'][store_brand]
                        product.update(store_info)
                        product['store_brand'] = store_brand
                        products[doc.id] = product
            else:
                # If no store filter, still be selective about what we load
                docs = self.collection.where('current.color_lab', '>', []).stream()
                
                for doc in docs:
                    data = doc.to_dict()
                    current = data.get('current')
                    if current and 'color_lab' in current and current['color_lab']:
                        products[doc.id] = current
            
            print(f"Loaded {len(products)} products to RAM" + 
                  (f" for store '{store_brand}'" if store_brand else ""))
            return products
            
        except Exception as e:
            print(f"Error loading products to RAM: {e}")
            return {}
    
    def match_products_by_color(self, target_color: List[float], store_brand: str,
                               product_type: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Matches products by color similarity.
        
        Args:
            target_color: Target color in LAB format [L, a, b]
            store_brand: Store brand to filter by
            product_type: Optional product type filter
            limit: Maximum number of results
            
        Returns:
            List of matched products sorted by color distance
        """
        try:
            # Load products to RAM for fast color matching
            products = self.load_all_products_to_ram(store_brand)
            
            # Filter by product type if specified
            if product_type:
                products = {pid: data for pid, data in products.items() 
                          if data.get('type') == product_type}
            
            # Calculate color distances and sort
            product_distances = []
            for product_id, product_data in products.items():
                if 'color_lab' in product_data:
                    distance = distance_between_colors(target_color, product_data['color_lab'])
                    product_data['color_distance'] = distance
                    product_data['product_id'] = product_id
                    product_distances.append(product_data)
            
            # Sort by distance and limit results
            sorted_products = sorted(product_distances, key=lambda x: x['color_distance'])[:limit]
            
            return sorted_products
            
        except Exception as e:
            print(f"Error matching products by color: {e}")
            return []
    
    def get_store_brands(self) -> List[str]:
        """
        Gets all available store brands efficiently using caching.
        
        Returns:
            List of store brand names
        """
        cache_key = self._get_cache_key('get_store_brands')
        cached_result = self._get_from_cache(cache_key)
        if cached_result is not None:
            print(f"Cache hit for store brands")
            return cached_result
        
        try:
            # Use a more efficient approach - cache the brands or use a separate collection
            # For now, we'll use the known brands from our system
            known_brands = ['dm', 'douglas']
            
            # Verify at least one product exists for each brand
            verified_brands = []
            for brand in known_brands:
                # Use limit(1) to check if any products exist for this brand
                docs = self.collection.where(f'current.retailers.{brand}', '>', {}).limit(1).stream()
                if any(docs):
                    verified_brands.append(brand)
            
            result = sorted(verified_brands)
            
            # Cache the result
            self._set_cache(cache_key, result)
            return result
            
        except Exception as e:
            print(f"Error getting store brands: {e}")
            # Fallback to known brands if query fails
            return ['dm', 'douglas']
    
    def get_product_types(self, store_brand: str = None) -> List[str]:
        """
        Gets all available product types efficiently with caching, optionally filtered by store brand.
        
        Args:
            store_brand: Optional store brand filter
            
        Returns:
            List of product type names
        """
        cache_key = self._get_cache_key('get_product_types', store_brand)
        cached_result = self._get_from_cache(cache_key)
        if cached_result is not None:
            print(f"Cache hit for product types (store: {store_brand})")
            return cached_result
        
        try:
            # Use distinct query approach - get unique types more efficiently
            types = set()
            
            if store_brand:
                # Query only products available in the specified store
                docs = self.collection.where(f'current.retailers.{store_brand}', '>', {}).stream()
                
                for doc in docs:
                    data = doc.to_dict()
                    current = data.get('current', {})
                    if 'type' in current:
                        types.add(current['type'])
                        # Early exit if we have all expected types
                        if len(types) >= 10:  # Reasonable limit
                            break
            else:
                # For all products, use a more efficient approach
                # Get a sample of products to determine types
                docs = self.collection.limit(100).stream()
                
                for doc in docs:
                    data = doc.to_dict()
                    current = data.get('current', {})
                    if 'type' in current:
                        types.add(current['type'])
            
            result = sorted(list(types))
            
            # Cache the result
            self._set_cache(cache_key, result)
            return result
            
        except Exception as e:
            print(f"Error getting product types: {e}")
            # Fallback to known types
            if store_brand == 'dm':
                return ['BB-cream and CC-cream', 'concealer', 'foundation', 'highlighter', 'powder']
            elif store_brand == 'douglas':
                return ['foundation']
            else:
                return ['foundation', 'concealer', 'powder', 'highlighter', 'BB-cream and CC-cream']
    
    def batch_create_products(self, products: List[Dict[str, Any]], 
                            batch_size: int = 500) -> Tuple[int, int]:
        """
        Creates multiple products in batches.
        
        Args:
            products: List of product dictionaries with 'id' and 'data' keys
            batch_size: Number of products per batch
            
        Returns:
            Tuple of (successful_count, failed_count)
        """
        successful_count = 0
        failed_count = 0
        
        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            batch_obj = self.db.batch()
            
            try:
                timestamp = datetime.utcnow().isoformat() + 'Z'
                
                for product in batch:
                    product_id = product['id']
                    product_data = product['data']
                    
                    doc_data = {
                        'current': {
                            **product_data,
                            'last_updated': timestamp
                        },
                        'changes': {
                            timestamp: {
                                'action': 'create',
                                'data': product_data,
                                'by': 'batch_import'
                            }
                        },
                        'metadata': {
                            'created_at': timestamp,
                            'version_count': 1,
                            'last_modified': timestamp
                        }
                    }
                    
                    doc_ref = self.collection.document(product_id)
                    batch_obj.set(doc_ref, doc_data)
                
                batch_obj.commit()
                successful_count += len(batch)
                print(f"Successfully created batch {i//batch_size + 1}: {len(batch)} products")
                
            except Exception as e:
                failed_count += len(batch)
                print(f"Error creating batch {i//batch_size + 1}: {e}")
        
        return successful_count, failed_count
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics for monitoring.
        
        Returns:
            Dictionary with cache statistics
        """
        return {
            'cache_entries': len(self._cache),
            'cache_keys': list(self._cache.keys()),
            'cache_timestamps': {k: v.isoformat() for k, v in self._cache_timestamps.items()},
            'cache_ttl_seconds': self._cache_ttl
        }
    
    def set_cache_ttl(self, ttl_seconds: int) -> None:
        """
        Set cache TTL (time to live).
        
        Args:
            ttl_seconds: Cache TTL in seconds
        """
        self._cache_ttl = ttl_seconds
        print(f"Cache TTL set to {ttl_seconds} seconds")
