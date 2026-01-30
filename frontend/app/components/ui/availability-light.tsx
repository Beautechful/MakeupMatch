import { useTheme } from '@mui/material/styles';
import React from 'react';

import { cn } from '~/utils/cn';

export type AvailabilityStatus =
  | 'available'
  | 'online'
  | 'unavailable'
  | 'unknown';

interface AvailabilityLightProps {
  status: AvailabilityStatus;
  size?: number;
  className?: string;
}

export function AvailabilityLight({
  status,
  size = 10,
  className,
}: AvailabilityLightProps) {
  const theme = useTheme();
  const color =
    status === 'unknown' ? 'transparent' : theme.palette.availability[status];

  return (
    <span
      className={cn('inline-block rounded-full m-1', className)}
      style={{ width: size, height: size, backgroundColor: color }}
      aria-label={status}
    />
  );
}

export default AvailabilityLight;
