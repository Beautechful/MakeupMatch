import { useMutation } from '@tanstack/react-query';

import { useSnackbar } from '~/context/snackbar-context';
import { useAuth } from '~/firebase/auth-provider';

import {
  fetchAllProducts,
  type GetAllProductsRequest,
  type GetAllProductsResponse,
} from '../api/products-api';

export function useGetAllProducts() {
  const { showError } = useSnackbar();
  const { token } = useAuth();

  return useMutation<GetAllProductsResponse, Error, GetAllProductsRequest>({
    mutationFn: (request) => fetchAllProducts(request, token),
    onError: (error) => {
      showError(`Failed to fetch products: ${error.message}`);
    },
  });
}
