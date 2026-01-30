import { Button, InputLabel, MenuItem } from '@mui/material';
import type { SelectProps } from '@mui/material';
import Select from '@mui/material/Select';
import { Controller, useFormContext } from 'react-hook-form';

export type RHFDropdownProps = Omit<SelectProps, 'options'> & {
  name: string;
  options: Array<{ value: string; label: string } | string>;
  label?: string;
};

export function RHFDropdown({
  name,
  options,
  label,
  variant = 'standard',
  ...others
}: RHFDropdownProps) {
  const { control } = useFormContext();

  return (
    <>
      <InputLabel id="select-label">Age</InputLabel>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Select
            labelId="select-label"
            {...field}
            fullWidth
            label={label}
            variant={variant}
            error={!!error}
            {...others}
          >
            {options.map((option) => {
              const value = typeof option === 'string' ? option : option.value;
              const label = typeof option === 'string' ? option : option.label;

              return (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              );
            })}
          </Select>
        )}
      />
      <Button type="submit">Submit</Button>
    </>
  );
}
