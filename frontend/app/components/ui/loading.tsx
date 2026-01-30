// import { useTheme } from '@mui/material/styles};
import { motion } from 'framer-motion';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
}

const triangle = [
  { x: 0, y: -32 }, // top
  { x: 28, y: 16 }, // bottom right
  { x: -28, y: 16 }, // bottom left
];

export function Loading({ size = 'medium' }: LoadingProps) {
  const sizeMap = {
    small: { circle: 18, gap: 56 },
    medium: { circle: 32, gap: 100 },
    large: { circle: 48, gap: 140 },
  };
  const { circle, gap } = sizeMap[size];

  const colors = [
    '#C49E91', // top (light)
    '#906B4D', // right (medium)
    '#4d3725', // left (dark)
  ];

  const getKeyframes = (startIdx: number) => {
    const order = [0, 1, 2].map((i) => (i + startIdx) % 3);
    return {
      x: order.map((i) => triangle[i].x).concat(triangle[order[0]].x),
      y: order.map((i) => triangle[i].y).concat(triangle[order[0]].y),
    };
  };

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: gap, height: gap }}
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => {
        const keyframes = getKeyframes(i);
        return (
          <motion.div
            key={i}
            className={`absolute rounded-full shadow-[0_1px_4px_0_rgba(0,0,0,0.04)]`}
            style={{
              width: circle,
              height: circle,
              backgroundColor: colors[i],
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              x: keyframes.x,
              y: keyframes.y,
              transition: {
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                duration: 2.0,
                times: [0, 0.33, 0.66, 1],
              },
            }}
            initial={{ x: triangle[i].x, y: triangle[i].y }}
          />
        );
      })}
    </div>
  );
}
