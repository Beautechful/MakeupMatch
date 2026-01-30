import type { FilterState } from '~/features/results/hooks/use-filters-hook';
import type { Match } from '~/features/results/types';
import i18next from '~/i18n';

export function filterProducts(
  products: Match[],
  filters: FilterState,
): Match[] {
  return products.filter((product) => {
    // Filter by brand
    if (filters.brand?.length && filters.brand?.length > 0) {
      const productBrand = product.brand.trim();
      const hasMatchingBrand = filters.brand.some(
        (brand) => productBrand.toLowerCase() === brand.toLowerCase(),
      );
      if (!hasMatchingBrand) {
        return false;
      }
    }

    // Filter by product type (category)
    if (filters.category?.length && filters.category?.length > 0) {
      const productTypeLower = product.type.toLowerCase();
      const hasMatchingCategory = filters.category.some((category) =>
        productTypeLower.includes(category.toLowerCase()),
      );
      if (!hasMatchingCategory) {
        return false;
      }
    }

    // Filter by "available" option in Others tab only
    if (
      (filters.others && filters.others?.includes('Available')) ||
      filters.others?.includes('Verfügbar')
    ) {
      if (product.availability !== 'available') {
        return false;
      }
    }

    // Filter by coverage
    if (filters.coverage?.length && filters.coverage?.length > 0) {
      const productCoverage =
        product.features?.coverage?.[0].toLowerCase() || '';
      if (!productCoverage) {
        return false;
      }
      const productCoverageTranslated = i18next
        .t(`results.filters.coverageOptions.${productCoverage}`, {
          lng: i18next.language,
          defaultValue: productCoverage, // Fallback to original if translation not found
        })
        .toLowerCase();
      const hasMatchingCoverage = filters.coverage.some((coverage) =>
        productCoverageTranslated.includes(coverage.toLowerCase()),
      );
      if (!hasMatchingCoverage) {
        return false;
      }
    }

    // Add more filter logic here for other product properties
    // Other filtering (Vegan, Alcohol-free, etc.) would need product properties

    return true;
  });
}

/**
 * Extracts unique brands from a list of products
 * Returns a sorted array of brand names
 */
export function extractBrandsFromProducts(products: Match[]): string[] {
  const brandSet = new Set<string>();

  products.forEach((product) => {
    if (product.brand && product.brand.trim()) {
      brandSet.add(product.brand.trim());
    }
  });

  return Array.from(brandSet).sort((a, b) => a.localeCompare(b));
}
