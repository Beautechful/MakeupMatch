import type { Bundle } from '~/features/bundle/types';

export const mockBundle: Bundle = {
  user_id: '7737f97e-959f-4f1f-9afc-ba7c381eb6c9',
  main_product: {
    image:
      'https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1747413553/assets/pas/images/61c27840-56ed-4590-b30d-47b289c6f147/l-oreal-paris-foundation-true-match-5-n',
    brand: "L'ORÉAL PARiS",
    description: 'Foundation True Match 5.N, 30 ml',
    type: 'foundation',
    price: '9.95 €',
    availability: 'available',
    product_id: '3600522862420',
  },
  bundle: [
    {
      image:
        'https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1755092829/assets/pas/images/7ee5cdb5-e0ca-4d90-9605-3b919a340668/ebelin-professional-rougepinsel',
      brand: 'ebelin PROFESSIONAL',
      description: 'Rougepinsel',
      price: '4,45 €',
      availability: 'available',
      product_id: '4067796198836',
    },
    {
      image:
        'https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1754953522/assets/pas/images/4d125075-6593-4524-8a42-b6ac77134fc9/ebelin-make-up-ei-und-baking-sponge',
      brand: 'ebelin',
      description: 'Make Up Ei & Baking Sponge',
      price: '2,75 €',
      availability: 'available',
      product_id: '4066447744903',
    },
    {
      image:
        'https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1753399083/assets/pas/images/adb3c6dc-5cc2-48b6-a0fd-db1e0b7d1621/no-cosmetics-gesichtscreme-all-in-barrier',
      brand: 'Nø Cosmetics',
      description: 'Gesichtscreme All-In Barrier, 50 ml',
      price: '16,95 €',
      availability: 'online',
      product_id: '4260524941401',
    },
    {
      image:
        'https://products.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1747492230/assets/pas/images/1cf12bd1-23c8-4d37-bff5-9438c92014ad/yeauty-augenpads-energy-elixir-1-paar',
      brand: 'Yeauty',
      description: 'Augenpads Energy Elixir (1 Paar), 2 St',
      price: '0,95 €',
      availability: 'online',
      product_id: '4260199892503',
    },
  ],
};
