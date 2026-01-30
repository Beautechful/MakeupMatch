import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { DefaultButton } from './default-button';

interface TimeButtonProps {
  text: string;
  handleClick: () => void;
  style?: React.CSSProperties;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  fullWidth?: boolean;
  timeDelay?: number; // in milliseconds
  autoPress?: boolean; // whether to auto-press after timeDelay
}

export function TimeButton({
  text,
  handleClick,
  style,
  type,
  disabled,
  size = 'medium',
  fullWidth = false,
  timeDelay = 5000,
  autoPress = false,
}: TimeButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoPress || disabled) {
      return;
    }

    // Start the animation
    startTimeRef.current = Date.now();
    setProgress(0);
    setIsActive(true);

    // Update progress every 16ms (~60fps)
    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / timeDelay) * 100, 100);

      setProgress(newProgress);

      if (newProgress >= 100) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 16);

    // Auto-press after timeDelay
    timeoutRef.current = setTimeout(() => {
      if (isActive && !disabled) {
        handleClick();
      }
    }, timeDelay);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [autoPress, disabled, timeDelay, handleClick, isActive]);

  // Cleanup on unmount or when component becomes inactive
  useEffect(() => {
    return () => {
      setIsActive(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleManualClick = () => {
    // Stop auto-press timers if user clicks manually
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsActive(false);
    handleClick();
  };

  // Create overlay style for the darkening effect
  const getBorderRadius = () => {
    if (size === 'xlarge') return '20px';
    return '4px'; // Material-UI default border radius for contained buttons
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(to right, rgba(0, 0, 0, 0.4) ${progress}%, transparent ${progress}%)`,
    borderRadius: getBorderRadius(),
    pointerEvents: 'none',
    zIndex: 2, // Make sure overlay is on top of the button
    transition: progress >= 100 ? 'background-color 0.2s ease' : 'none',
    backgroundColor: progress >= 100 ? 'rgba(0, 0, 0, 0.4)' : 'transparent',
  };

  const buttonContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    borderRadius: getBorderRadius(),
    overflow: 'hidden', // Clip the overlay to container bounds
    ...style,
  };

  return (
    <div style={buttonContainerStyle}>
      <DefaultButton
        text={text}
        handleClick={handleManualClick}
        style={{
          position: 'relative',
          zIndex: 1,
        }}
        type={type}
        disabled={disabled}
        size={size}
        fullWidth={fullWidth}
      />
      {autoPress && !disabled && <div style={overlayStyle} />}
    </div>
  );
}
