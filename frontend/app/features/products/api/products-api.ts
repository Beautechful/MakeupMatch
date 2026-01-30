import { api } from '~/utils/api-client';

export interface ProductData {
  product_id: string;
  product_brand_name: string;
  product_description: string;
  product_color_swatch: string;
  product_image: string;
  product_link: string;
  price: string;
  type: string;
  match_percentage: string;
  color_distance: number;
  erp_connection: boolean;
  instore_status: boolean;
  online_status: boolean;
  stock_level: number;
  store_brand: string;
  color_lab: [number, number, number];
  color_hex: string;
  corrected_color_lab: [number, number, number];
  history: Record<
    string,
    {
      color_hex: string;
      color_lab: [number, number, number];
    }
  >;
}

export interface GetAllProductsRequest {
  store_name: string;
  store_location: string;
  length: number;
  target_color: [number, number, number];
}

export interface GetAllProductsResponse {
  products: ProductData[];
}

export async function fetchAllProducts(
  request: GetAllProductsRequest,
  token?: string,
): Promise<GetAllProductsResponse> {
  return api.post<GetAllProductsResponse>('/get_all_products', request, {
    token,
  });
}
