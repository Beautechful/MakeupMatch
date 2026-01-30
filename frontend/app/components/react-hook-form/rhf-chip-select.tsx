import type { ChipOwnProps } from '@mui/material';
import { Chip } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';

export interface RHFChipSelectProps extends ChipOwnProps {
  name: string;
  chips: Record<string, string>;
  limit?: number;
}

export function RHFChipSelect({
  name,
  chips,
  disabled = false,
  ...others
}: RHFChipSelectProps) {
  const formContext = useFormContext();
  const { control } = formContext;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        return (
          <>
            {Object.entries(chips).map(([key, value]) => {
              const isSelected = field.value === key;
              return (
                <Chip
                  key={key}
                  {...field}
                  disabled={disabled}
                  label={value}
                  variant={isSelected ? 'filled' : 'outlined'}
                  onClick={() => {
                    field.onChange(key);
                  }}
                  sx={(theme) => ({
                    height: '78px',
                    width: '100%',
                    fontWeight: 500,
                    padding: '16px 24px',
                    minWidth: '120px',
                    fontSize: '2rem',
                    // Disable all interaction states for consistent appearance
                    '&:hover': {
                      backgroundColor: isSelected
                        ? theme.palette.primary.main
                        : 'transparent',
                    },
                    '&:focus': {
                      backgroundColor: isSelected
                        ? theme.palette.primary.main
                        : 'transparent',
                    },
                    '&:active': {
                      backgroundColor: isSelected
                        ? theme.palette.primary.main
                        : 'transparent',
                    },
                    '&.Mui-focusVisible': {
                      backgroundColor: isSelected
                        ? theme.palette.primary.main
                        : 'transparent',
                    },
                    ...(isSelected && {
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.background.default,
                    }),
                    '& .MuiChip-label': {
                      padding: '0 12px',
                      fontSize: '2rem',
                      fontWeight: 500,
                      ...(isSelected && {
                        color: theme.palette.background.default,
                      }),
                    },
                  })}
                  {...others}
                />
              );
            })}
          </>
        );
      }}
    />
  );
}
