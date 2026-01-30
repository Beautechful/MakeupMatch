import { Typography, useMediaQuery } from '@mui/material';
import type { TypographyProps } from '@mui/material';

interface TypographyMultiSizeProps {
  text: string;
  variant_small: TypographyProps['variant'];
  variant_large: TypographyProps['variant'];
  fontWeight?: TypographyProps['fontWeight'];
  color?: TypographyProps['color'];
  className?: string;
  style?: React.CSSProperties;
}

export function TypographyMultiSize({
  text,
  variant_small,
  variant_large,
  fontWeight,
  color,
  className,

  style,
}: TypographyMultiSizeProps) {
  const isLargeScreen = useMediaQuery('(min-width:1000px)');
  const variant = isLargeScreen ? variant_large : variant_small;

  return (
    <Typography
      variant={variant}
      style={{
        ...style,
      }}
      fontWeight={fontWeight}
      color={color}
      className={className}
    >
      {text}
    </Typography>
  );
}
