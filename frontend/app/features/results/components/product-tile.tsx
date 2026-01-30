import { Typography, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
// import { useNavigate, useSearchParams } from 'react-router';

import type { Match, Product } from '~/features/results/types';
import theme from '~/styles/theme';
import { cn } from '~/utils/cn';

import AvailabilityLight from '../../../components/ui/availability-light';

interface ProductTileProps {
  product: Product;
}

export function ProductTile({ match }: { match: Match }) {
  const { image, brand, description, type, price, availability } = match;
  return (
    <div className="flex flex-col items-center bg-background-paper p-4 rounded-lg shadow-md w-34 h-full">
      <div className="flex justify-center items-center mb-4">
        <img
          src={image}
          alt={brand}
          className="object-contain max-h-32 max-w-full"
        />
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <Typography
            variant="body1"
            fontWeight={600}
            color="text.primary"
            className="leading-tight mb-1 line-clamp-2"
          >
            {brand}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mb-1">
            {description}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="italic">
            {type}
          </Typography>
        </div>
        <div className="flex items-center justify-end mt-2">
          {availability && <AvailabilityLight status={availability} />}
          <Typography
            variant="body1"
            fontWeight={600}
            color="text.primary"
            className="ml-2"
          >
            {price}
          </Typography>
        </div>
      </div>
    </div>
  );
}

export function ProductTileHorizontal({ product }: ProductTileProps) {
  const { t } = useTranslation();
  const { image, brand, description, type, price, availability, rank } =
    product;

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <div
      className={cn(
        'relative grid grid-cols-6 gap-2 sm:gap-6 bg-white rounded-xl py-4 px-1 sm:p-6 w-full max-w-3xl outline h-[150px] sm:h-[240px] outline-[#EEEDEC]',
        { ['outline-[#6EB771]']: rank === 1 },
      )}
    >
      <div>
        <span
          className={cn(
            'absolute -top-7 left-2 w-fit bg-[#6EB771] rounded-x-md rounded-t-md py-1 px-2 text-white text-sm',
            {
              hidden: rank !== 1,
            },
          )}
        >
          {t('results.bestMatch')}
        </span>
        <div className="flex col-span-1 justify-center w-full">
          <img
            src={image}
            alt={brand}
            className="object-contain h-28 sm:h-50 w-auto"
          />
        </div>
      </div>

      <div className="flex flex-col col-span-5 gap-2 justify-between sm:py-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Typography
              variant={isMobile ? 'body1' : 'h5'}
              fontWeight={500}
              color="text.primary"
            >
              {brand}
            </Typography>
            <Typography
              variant={isMobile ? 'body2' : 'h6'}
              color="text.primary"
              className="line-clamp-2"
            >
              {description}
            </Typography>
          </div>
          <Typography
            variant={isMobile ? 'body2' : 'body1'}
            color="text.secondary"
            className="italic capitalize"
          >
            {type}
          </Typography>
        </div>

        <span className="flex items-center text-xs sm:text-lg">
          {availability && (
            <AvailabilityLight status={availability} className="mr-2" />
          )}
          {price}
        </span>
      </div>
    </div>
  );
}

export function ProductTileHorizontalRanked({ product }: ProductTileProps) {
  const { image, brand, description, type, price, id, rank, availability } =
    product;

  // const [searchParams] = useSearchParams();
  // const userId = searchParams.get('userId');

  // const navigate = useNavigate();
  // const handleOnClickProduct = () => {
  //   navigate(`/bundle/${id}?userId=${userId}`);
  // };

  return (
    <button
      onClick={() => {}}
      className="flex flex-row items-center w-full sm:pt-4 text-left"
    >
      <ProductTileHorizontal
        product={{
          id: id,
          image: image,
          brand: brand,
          description: description,
          type: type,
          price: price,
          availability: availability,
          rank: rank,
          product_id: id,
          gtin: id,
        }}
      />
    </button>
  );
}

export default ProductTile;
