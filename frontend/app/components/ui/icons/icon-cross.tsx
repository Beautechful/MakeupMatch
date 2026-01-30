import type { IconType } from '~/components/ui/icons/icon.type';

export const IconCross: React.FC<IconType> = ({
  color,
  width,
  height,
  className,
  ...rest
}) => (
  <svg
    fill={color ?? 'currentColor'}
    {...rest}
    stroke={color ?? 'currentColor'}
    className={className}
    width={width ?? '43'}
    height={height ?? '43'}
    viewBox="0 0 43 43"
  >
    <path
      d="M11.2339 33.357L9.14844 31.2964L19.3685 21.1978L9.14844 11.0992L11.2339 9.03857L21.4545 19.1367L31.675 9.03857L33.7605 11.0992L23.5404 21.1978L33.7605 31.2964L31.675 33.357L21.4545 23.2588L11.2339 33.357Z"
      fill="currentColor"
    />
  </svg>
);
