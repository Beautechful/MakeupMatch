import type { IconType } from '~/components/ui/icons/icon.type';

export const IconArrowLeft: React.FC<IconType> = ({
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
    width={width ?? '24'}
    height={height ?? '24'}
    viewBox="0 0 24 24"
  >
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g
      id="SVGRepo_tracerCarrier"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></g>
    <g id="SVGRepo_iconCarrier">
      <path
        d="M5 12H19M5 12L11 6M5 12L11 18"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>
    </g>
  </svg>
);
