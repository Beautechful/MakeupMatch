import { useQuery } from '@tanstack/react-query';

import { fetchOriginals } from '../api/get-originals';

const MOCK_DATA = {
  originals: [
    {
      id: '0zBTqRQ6t6z9z7JVOHmm',
      url: 'link',
      description:
        '{"gender": "female", "ethnicity": "east asian", "age range": "middle-aged", "hair length": "long", "skin type": "smooth and clear", "body type": "average", "eye color": "green", "hair style": "wavy", "hair color": "black", "skin tone": "white", "face shape": "oval", "special features": null}',
      information:
        '{"generation_model": "imagen-4.0-fast-generate-001", "generation_prompt": "Professional portrait photograph of a middle-aged east asian female, looking directly into the camera with a neutral expression. She has long, wavy black hair, oval face shape, smooth and clear white skin tone, and green eyes. The photo is taken outdoors, backgound blurred, focus on the subject. Soft, even lighting with gentle gradients and no harsh shadows or bright highlights on the subject\'s face. high quality, authentic, natural skin texture, realistic, documentary photography style, 105mm lense", "recorded_clashes": []}',
      created_at: '2025-11-21T13:52:13.449000+00:00',
    },
  ],
};

export function useOriginalsQuery() {
  return useQuery({
    queryKey: ['originals'],
    queryFn: async () => {
      try {
        return await fetchOriginals();
      } catch (error) {
        console.warn('Failed to fetch originals, using mock data:', error);
        return MOCK_DATA;
      }
    },
  });
}
