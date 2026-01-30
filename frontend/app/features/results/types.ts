export type Availability = 'available' | 'online' | 'unavailable' | 'unknown';

export type ProductType =
  | 'BB-cream and CC-cream'
  | 'concealer'
  | 'foundation'
  | 'highlighter'
  | 'powder';

// export type Match = {
//   image: string;
//   brand: string;
//   description: string;
//   type: string;
//   price: string;
//   availability: Availability;
// };

export type Match = {
  product_id: string;
  image: string;
  brand: string;
  description: string;
  type: string;
  price: string;
  availability: 'available' | 'online' | 'unavailable' | 'unknown';
  gtin: string;
  features: Record<string, any>;
};

export type Product = {
  id: string;
  rank: number;
} & Match;

type Client = {
  color: string;
};

export type RecommendedProduct = {
  product_brand_name: string;
  product_description: string;
  product_color_swatch: string;
  type: string;
  price: string;
  product_image: string;
  product_link: string;
  erp_connection: boolean;
  instore_status: boolean;
  online_status: boolean;
  stock_level: number;
  match_percentage: string;
  product_id: string;
  features?: Record<string, any>;
};

export type Result = {
  user_id: string;
  timestamp: string;
  client: Client;
  products: RecommendedProduct[];
  product_types: ProductType[];
};
