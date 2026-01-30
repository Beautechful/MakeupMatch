import { Typography } from '@mui/material';

import AvailabilityLight from '~/components/ui/availability-light';
import type { Availability } from '~/features/results/types';
import { cn } from '~/utils/cn';

type ProductAvailabilityProps = {
  availability: Availability;
  price: string;
  position?: 'left' | 'right';
  className?: string;
  size?: 'small' | 'medium';
};

export const ProductAvailability = ({
  availability,
  price,
  position = 'left',
  size = 'medium',
  className,
}: ProductAvailabilityProps) => {
  return (
    <div
      className={cn('flex items-center mt-2', {
        'justify-end': position === 'right',
        className,
      })}
    >
      {availability && <AvailabilityLight status={availability} />}
      <Typography
        variant={size === 'medium' ? 'body1' : 'body2'}
        color="text.primary"
        className="ml-2"
      >
        {price}
      </Typography>
    </div>
  );
};
