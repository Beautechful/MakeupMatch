import { useQuery } from '@tanstack/react-query';

import { fetchVariants } from '../api/get-variants';

const MOCK_DATA = {
  variants: [
    {
      id: '00BjUrxZu0Q6MOgz12rw',
      url: 'link',
      makeup_style_description: 'Preset Look: 2 Everyday Soft Glam',
      created_at: '2025-12-09T08:41:34.461000+00:00',
      original_id: 'EiwcbKm9G38hA3l3a9wg',
      hidden: false,
    },
  ],
};

export function useVariantsQuery() {
  return useQuery({
    queryKey: ['variants'],
    queryFn: async () => {
      try {
        return await fetchVariants();
      } catch (error) {
        console.warn('Failed to fetch variants, using mock data:', error);
        return MOCK_DATA;
      }
    },
  });
}
