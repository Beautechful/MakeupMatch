import { Typography, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { MainProduct as MainProductType } from '~/features/bundle/types';
import { ProductAvailability } from '~/features/results/components/product-availability';
import theme from '~/styles/theme';

export const MainProduct = ({ product }: { product: MainProductType }) => {
  const { image, brand, price, availability, description } = product;
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  return (
    <div className="sm:grid sm:grid-cols-4 w-full gap-2">
      <img
        src={image}
        alt={brand}
        className="object-contain sm:h-96 h-50 col-span-1 flex justify-center items-center w-full bg-[#F2F2F2] sm:bg-white p-2 rounded-xl"
      />
      <div className="flex flex-col text-left col-span-3 py-4 ml-2 sm:py-10 sm:ml-4 sm:gap-10 gap-6">
        <div>
          <Typography
            variant={isMobile ? 'h5' : 'h3'}
            fontWeight={600}
            color="text.primary"
            className="mb-1 line-clamp-2"
          >
            {brand}
          </Typography>
          <ProductAvailability availability={availability} price={price} />
        </div>
        <span className="flex flex-col gap-1 py-3 px-4 bg-[#6EB77126] rounded-md">
          <p className="text-[#1E1E1E] text-sm sm:text-md">
            {t('bundle.bestMatch')}
          </p>
          <Typography
            variant={isMobile ? 'body1' : 'h6'}
            color="text.primary"
            className="mb-1"
            fontWeight={500}
          >
            {description}
          </Typography>
        </span>
      </div>
    </div>
  );
};
