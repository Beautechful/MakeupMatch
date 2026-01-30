import { useMediaQuery } from '@mui/material';
import Button from '@mui/material/Button';
import type { ButtonHTMLAttributes } from 'react';
import { useEffect, useRef, useState } from 'react';

import theme from '~/styles/theme';

interface DefaultButtonProps {
  text: string;
  handleClick: () => void;
  style?: React.CSSProperties;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  disabled?: boolean;
  focus?: boolean;
  focusTimeout?: number;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  fullWidth?: boolean;
  shadowColor?: string;
}

export function DefaultButton({
  text,
  handleClick,
  style,
  type,
  disabled,
  focus = false,
  focusTimeout = 3000,
  size = 'medium',
  fullWidth = false,
  shadowColor = theme.palette.primary.main,
}: DefaultButtonProps) {
  const [shouldPulse, setShouldPulse] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLargeScreen = useMediaQuery('(min-width:1000px)');
  if (isLargeScreen) {
    if (size === 'small') {
      size = 'large';
    } else {
      size = 'xlarge';
    }
  }

  // Handle focus timeout and pulsing effect
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset pulsing state
    setShouldPulse(false);

    // Only start timer if focus is true and disabled is false
    if (focus && !disabled) {
      timeoutRef.current = setTimeout(() => {
        setShouldPulse(true);
      }, focusTimeout);
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [focus, disabled, focusTimeout]);

  // Handle button click
  const handleButtonClick = () => {
    // Disable pulsing when button is pressed
    setShouldPulse(false);

    // Clear timeout if it's still running
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Call the original click handler
    handleClick();
  };
  const getXlButtonStyle = () => {
    if (size === 'xlarge')
      return {
        padding: '16px 32px',
        fontSize: '2rem',
        fontWeight: '700',
        borderRadius: '20px',
      };
    if (size === 'xxlarge')
      return {
        padding: '20px 40px',
        fontSize: '2.5rem',
        fontWeight: '800',
        borderRadius: '25px',
      };
  };

  return (
    <Button
      onClick={handleButtonClick}
      variant="contained"
      size={size === 'xlarge' ? 'large' : size}
      fullWidth={fullWidth}
      style={{
        ...getXlButtonStyle(),
        ...style,
      }}
      type={type}
      disabled={disabled}
      sx={(theme) => ({
        '&.MuiButton-root': {
          textTransform: 'none',
        },
        ...(shouldPulse && {
          animation: 'pulse 1.5s ease-in-out infinite',
          '@keyframes pulse': {
            '0%': {
              transform: 'scale(1)',
              boxShadow: `0 0 0 0 ${shadowColor}70`,
            },
            '50%': {
              transform: 'scale(1.02)',
              boxShadow: `0 0 0 10px ${shadowColor}00`,
            },
            '100%': {
              transform: 'scale(1)',
              boxShadow: `0 0 0 0 ${shadowColor}00`,
            },
          },
        }),
      })}
    >
      {text}
    </Button>
  );
}
