import { Box, Button, SwipeableDrawer } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconCross } from '~/components/ui/icons';
import { MultiSelectFilter } from '~/features/results/components/multi-select-filter';
import { FILTER_CONFIG } from '~/features/results/config/filter-config';
import type { FilterState } from '~/features/results/hooks/use-filters-hook';
import theme from '~/styles/theme';

type ProductFiltersMobileProps = {
  filters: FilterState;
  setFilters: (newFilters: Partial<FilterState>) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  availableBrands?: string[];
};

export function ProductFiltersMobile({
  filters,
  setFilters,
  clearAllFilters,
  hasActiveFilters,
  availableBrands = [],
}: ProductFiltersMobileProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => (event: any) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    )
      return;
    setDrawerOpen(open);
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={toggleDrawer(true)}
        sx={{
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#906B4D',
          borderColor: '#906B4D',
        }}
      >
        {t('results.filters.title')}
      </Button>

      <SwipeableDrawer
        anchor="right"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
      >
        <Box
          sx={{
            width: 300,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'white',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 4 }}>
            <span style={{ fontWeight: 600, fontSize: '1.5rem' }}>
              {t('results.filters.title')}
            </span>
            <button onClick={() => setDrawerOpen(false)}>
              <IconCross
                width={30}
                height={30}
                color={theme.palette.primary.main}
              />
            </button>
          </Box>

          <Box
            sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
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
          </Box>

          <Box className="flex flex-col gap-3">
            {hasActiveFilters && (
              <Button fullWidth variant="outlined" onClick={clearAllFilters}>
                {t('results.filters.clear')}
              </Button>
            )}
          </Box>
        </Box>
      </SwipeableDrawer>
    </>
  );
}
