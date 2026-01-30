import SearchOffIcon from '@mui/icons-material/SearchOff';
import { Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { MultiSelectFilter } from '~/features/results/components/multi-select-filter';
import { FILTER_CONFIG } from '~/features/results/config/filter-config';
import type { FilterState } from '~/features/results/hooks/use-filters-hook';
export type ProductFiltersProps = {
  filters: FilterState;
  setFilters: (newFilters: Partial<FilterState>) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  availableBrands?: string[];
};

export function ProductFilters({
  filters,
  setFilters,
  clearAllFilters,
  hasActiveFilters,
  availableBrands = [],
}: ProductFiltersProps) {
  return (
    <div className="w-full  lg:px-0">
      <Box
        className="flex items-center justify-between w-full max-w-3xl mx-auto p-4"
        sx={{ backgroundColor: 'palette.light' }}
      >
        <div className="flex gap-3 items-center">
          {Object.entries(FILTER_CONFIG).map(([key, config]) => {
            // For brand filter, use dynamic brand list; for others, use config options
            const options =
              key === 'brand' ? availableBrands : config.optionKeys;

            return (
              <MultiSelectFilter
                key={key}
                filter={filters[key as keyof FilterState] || []}
                setFilter={(value: string) => setFilters({ [key]: value })}
                labelKey={config.labelKey}
                optionKeys={options}
                isDynamic={key === 'brand'}
              />
            );
          })}
        </div>

        {hasActiveFilters && (
          <Button
            variant="outlined"
            size="medium"
            onClick={clearAllFilters}
            sx={{
              textTransform: 'none',
              fontSize: '16px',
              color: '#906B4D',
              borderColor: '#906B4D',
              marginLeft: 2,
              height: '52px',

              '&:hover': {
                borderColor: '#4d3725',
                backgroundColor: 'rgba(144, 107, 77, 0.04)',
              },
            }}
          >
            <SearchOffIcon style={{ fontSize: '42px' }} />
          </Button>
        )}
      </Box>
    </div>
  );
}
