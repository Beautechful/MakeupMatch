import type { IconType } from '~/components/ui/icons/icon.type';

export const IconChevronLeft: React.FC<IconType> = ({
  color,
  width,
  height,
  className,
  ...rest
}) => (
  <svg
    fill="none "
    {...rest}
    stroke={color ?? 'currentColor'}
    className={className}
    width={width ?? '18'}
    height={height ?? '32'}
    viewBox="0 0 18 32"
  >
    <path
      d="M16 2L3 16L16 30"
      stroke={color ?? 'currentColor'}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);
