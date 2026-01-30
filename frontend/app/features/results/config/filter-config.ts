export const FILTER_CONFIG = {
  brand: {
    labelKey: 'results.filters.brand',
    optionKeys: [] as string[], // Will be populated dynamically from products
    isDynamic: true,
  },
  category: {
    labelKey: 'results.filters.category',
    optionKeys: [
      'results.filters.categoryOptions.concealer',
      'results.filters.categoryOptions.foundation',
    ] as string[],
    isDynamic: false,
  },
  coverage: {
    labelKey: 'results.filters.coverage',
    optionKeys: [
      'results.filters.coverageOptions.light',
      'results.filters.coverageOptions.medium',
      'results.filters.coverageOptions.full',
    ] as string[],
    isDynamic: false,
  },
  others: {
    labelKey: 'results.filters.other',
    optionKeys: [
      'results.filters.otherOptions.vegan',
      'results.filters.otherOptions.alcohol-free',
      'results.filters.otherOptions.natural',
      'results.filters.otherOptions.available',
    ] as string[],
    isDynamic: false,
  },
} as const;
