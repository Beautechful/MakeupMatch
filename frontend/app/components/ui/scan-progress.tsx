import CheckIcon from '@mui/icons-material/Check';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

interface ScanProgressItem {
  label: string;
  key: string;
}

interface ScanProgressProps {
  items: ScanProgressItem[];
  currentStep: number; // 0 to n-1
  errorIndex?: number | null; // Optional index of item to rescan (shows orange)
  completedSteps?: boolean[]; // Optional array to track completion status
}

export function ScanProgress({
  items,
  currentStep,
  errorIndex,
  completedSteps,
}: ScanProgressProps) {
  const theme = useTheme();
  const [progressWidth, setProgressWidth] = React.useState(0);

  // Calculate progress percentage based on current step
  React.useEffect(() => {
    const totalSteps = items.length;
    const completedPercentage = (currentStep / (totalSteps - 1)) * 100;
    // Animate the progress bar
    const timer = setTimeout(() => {
      setProgressWidth(Math.min(completedPercentage, 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, items.length]);

  return (
    <div className="w-full">
      {/* Progress bar and circles */}
      <div className="relative">
        {/* Circles with labels on top */}
        <div className="flex items-start justify-between">
          {items.map((item, index) => {
            const isCompleted = completedSteps
              ? completedSteps[index]
              : index < currentStep;
            const isCurrent = index === currentStep;
            const isError = index === errorIndex;

            let backgroundColor = 'white';
            let borderColor = theme.palette.grey[300];
            let showCheck = false;
            let textColor = theme.palette.text.disabled;

            if (isError) {
              backgroundColor = theme.palette.warning.main;
              borderColor = theme.palette.warning.main;
              textColor = theme.palette.warning.main;
            } else if (isCompleted) {
              backgroundColor = theme.palette.success.main;
              borderColor = theme.palette.success.main;
              showCheck = true;
              textColor = theme.palette.text.disabled;
            } else if (isCurrent) {
              backgroundColor = 'white';
              borderColor = theme.palette.primary.main;
              textColor = theme.palette.text.primary;
            }

            return (
              <div
                key={item.key}
                className="relative flex flex-col items-center flex-1"
              >
                {/* Label on top */}
                <Typography
                  variant="h4"
                  className="mb-2 text-center"
                  style={{
                    color: textColor,
                    fontWeight: isCurrent || isError ? 600 : 400,
                  }}
                >
                  {item.label}
                </Typography>

                {/* Circle */}
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300"
                  style={{
                    backgroundColor,
                    borderColor,
                    zIndex: 2,
                    position: 'relative',
                  }}
                >
                  {showCheck ? (
                    <CheckIcon
                      style={{
                        fontSize: '1.5rem',
                        color: 'white',
                      }}
                    />
                  ) : (
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      style={{
                        color: isError
                          ? 'white'
                          : isCurrent
                            ? theme.palette.primary.main
                            : theme.palette.text.disabled,
                      }}
                    >
                      {index + 1}
                    </Typography>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Background line - positioned to go through circles */}
        <div
          className="absolute h-0.5"
          style={{
            backgroundColor: theme.palette.grey[300],
            zIndex: 0,
            left: `calc(${100 / (items.length * 2)}%)`,
            right: `calc(${100 / (items.length * 2)}%)`,
            top: 'calc(2rem + 0.5rem + 1.25rem)', // Typography h4 line-height + mb-2 + half of circle (h-10/2)
          }}
        />

        {/* Animated progress line - positioned to go through circles */}
        <div
          className="absolute h-0.5 transition-all duration-500 ease-in-out"
          style={{
            width: `calc((${progressWidth}% * ${(items.length - 1) / items.length}) )`,
            backgroundColor: theme.palette.success.main,
            zIndex: 1,
            left: `calc(${100 / (items.length * 2)}%)`,
            top: 'calc(2rem + 0.5rem + 1.25rem)', // Same as background line
          }}
        />
      </div>
    </div>
  );
}
