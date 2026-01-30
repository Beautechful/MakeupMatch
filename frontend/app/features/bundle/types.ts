import type { Availability } from '~/features/results/types';

export type BundleProduct = {
  image: string;
  brand: string;
  description: string;
  price: string;
  availability: Availability;
  product_id: string;
};

export type MainProduct = {
  type: string;
} & BundleProduct;

export type Bundle = {
  user_id: string;
  main_product: MainProduct;
  bundle: BundleProduct[];
};
