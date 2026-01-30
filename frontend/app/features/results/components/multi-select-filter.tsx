import {
  Checkbox,
  FormControl,
  ListItemText,
  MenuItem,
  Select,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '~/utils/cn';

type MultiSelectFilterProps = {
  filter: string[];
  setFilter: (filter: string[]) => void;
  labelKey: string;
  optionKeys?: string[];
  isDynamic?: boolean; // If true, options are used directly without translation
};

export const MultiSelectFilter = ({
  filter,
  setFilter,
  labelKey,
  optionKeys = [],
  isDynamic = false,
}: MultiSelectFilterProps) => {
  const { t } = useTranslation();
  const [cacheFilters, setCachedFilters] = useState<string[] | null>(null);

  // For dynamic options (like brands), use them directly; otherwise translate
  const options = isDynamic
    ? optionKeys
    : optionKeys.map((key: string) => t(key));

  const handleChange = (event: any) => {
    const value = event.target.value;
    const newValue = typeof value === 'string' ? value.split(',') : value;
    setCachedFilters(newValue);
  };

  const handleMenuClose = () => {
    // Apply cached filters to actual filters when menu closes
    if (cacheFilters !== null) {
      setFilter(cacheFilters);
    }
  };

  return (
    <FormControl size="medium" className="sm:w-42">
      <Select
        className={cacheFilters && cacheFilters.length > 0 ? 'has-filters' : ''}
        multiple
        value={cacheFilters || filter}
        onChange={handleChange}
        onClose={handleMenuClose}
        displayEmpty
        renderValue={(selected) => (
          <span
            className={cn('text-[#302f2f] text-lg font-semibold', {
              'text-[#906B4D]': selected.length > 0,
            })}
          >
            {t(labelKey)}
          </span>
        )}
        sx={{
          height: '56px',
          fontSize: '18px',
          fontWeight: 600,
          border: '2px solid #e0e0e0',
          '&:hover': {
            borderColor: '#906B4D',
          },
          '&.Mui-focused': {
            borderColor: '#906B4D',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
          '& .MuiSelect-select': {
            py: '16px',
            px: '16px',
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              mt: '8px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              '& .MuiMenu-list': {
                py: 0,
              },
            },
          },
        }}
      >
        {options.map((option: string) => (
          <MenuItem key={option} value={option} sx={{ p: '12px 16px' }}>
            <Checkbox
              checked={(cacheFilters ?? filter).indexOf(option) > -1}
              size="medium"
              sx={{
                color: '#906B4D',
                '&.Mui-checked': {
                  color: '#906B4D',
                },
              }}
            />
            <ListItemText
              primary={option}
              sx={{
                '& .MuiTypography-root': {
                  fontSize: '16px',
                  fontWeight: 500,
                },
              }}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
