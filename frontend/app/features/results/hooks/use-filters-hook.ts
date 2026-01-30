import { useEffect, useMemo, useState } from 'react';

export interface FilterState {
  brand: string[];
  category: string[];
  coverage: string[];
  others: string[];
}

const FILTERS_KEY = 'app_filters';
const ENABLE_CACHE = false;

export function useFilters(initialState?: Partial<FilterState>) {
  const [filters, setFiltersState] = useState<FilterState>(() => {
    try {
      if (ENABLE_CACHE) {
        const saved = localStorage.getItem(FILTERS_KEY);
        if (saved) return JSON.parse(saved) as FilterState;
      }
    } catch (e) {
      console.warn('Failed to parse saved filters:', e);
    }
    return {
      brand: [],
      category: [],
      coverage: [],
      others: ['Available'],
      ...initialState,
    };
  });

  useEffect(() => {
    if (ENABLE_CACHE) {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    }
  }, [filters]);

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  };

  const clearAllFilters = () => {
    const cleared = { brand: [], category: [], coverage: [], others: [] };
    setFiltersState(cleared);
    if (ENABLE_CACHE) {
      localStorage.removeItem(FILTERS_KEY);
    }
  };

  const clearCache = () => {
    if (ENABLE_CACHE) {
      localStorage.removeItem(FILTERS_KEY);
    }
  };

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((arr) => arr.length > 0),
    [filters],
  );

  return {
    filters,
    setFilters,
    clearAllFilters,
    hasActiveFilters,
    clearCache,
  };
}
