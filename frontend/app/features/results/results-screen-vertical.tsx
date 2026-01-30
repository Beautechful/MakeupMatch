import { Typography, Tabs, Tab, Box } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { CloseLayout } from '~/components/layouts/close-layout';
import { SmallLarge } from '~/components/layouts/small-large';
import { DefaultButton } from '~/components/ui/default-button';
import { QRCodeBanner } from '~/components/ui/qr-code-banner';
import { useClarityContext } from '~/context/clarity';
import { ConfirmExitModal } from '~/features/results/components/confirm-exit-modal';
import { ProductFilters } from '~/features/results/components/product-filters';
import { ProductFiltersMobile } from '~/features/results/components/product-filters-mobile';
import { ProductTileHorizontalRanked } from '~/features/results/components/product-tile';
import {
  useFilters,
  type FilterState,
} from '~/features/results/hooks/use-filters-hook';
import type { Match } from '~/features/results/types';
import { useUserFlowExit } from '~/features/user-flow/hooks/use-user-flow-exit';

import { BundleComponent } from '../bundle/bundle-screen';
import type { Bundle } from '../bundle/types';

import { clearAllResultsFromStorage } from './result-api';
import {
  filterProducts,
  extractBrandsFromProducts,
} from './utils/filter-products';

interface ResultsScreenVerticalProps {
  analysisResults: { label: string; value: string }[];
  topMatches: Match[];
  bundle: Bundle;
}

export function ResultsScreenVertical({
  topMatches,
  bundle,
}: ResultsScreenVerticalProps) {
  const numberOfProductsToShow = 3;
  const { t } = useTranslation();
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = () => {
    if (activeTab === 0) {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  };
  const navigate = useNavigate();

  // const handleOpenConfirmExit = () => setIsConfirmExitOpen(true);
  const handleCloseConfirmExit = () => setIsConfirmExitOpen(false);

  const userFlowExitMutation = useUserFlowExit();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const { endSession } = useClarityContext();

  const { filters, setFilters, clearAllFilters, hasActiveFilters, clearCache } =
    useFilters();

  // Extract available brands from all products
  const availableBrands = useMemo(
    () => extractBrandsFromProducts(topMatches),
    [topMatches],
  );

  const filteredMatches = useMemo(
    () => filterProducts(topMatches, filters).slice(0, numberOfProductsToShow),
    [topMatches, filters],
  );

  const pressExitButton = () => {
    const userFlowExit = {
      filters: filters,
      final_recommendations: filteredMatches,
    };

    if (userId) {
      userFlowExitMutation.mutate(
        {
          userId,
          data: userFlowExit,
        },
        {
          onSuccess: () => {
            // navigate('/');
          },
          onError: (error) => {
            console.error('Failed to send user flow exit data:', error);
            // navigate('/');
          },
        },
      );
    } else {
      console.warn('No user ID available for user flow exit tracking');
      navigate('/');
    }
  };

  const handleOnConfirmExit = () => {
    endSession();
    clearAllResultsFromStorage();
    clearCache();
    pressExitButton();
    window.location.href = '/';
  };

  function FiltersComponent(
    filters: FilterState,
    setFilters: any,
    clearAllFilters: any,
    hasActiveFilters: boolean,
    availableBrands: string[],
  ) {
    return (
      <>
        <div className="hidden sm:flex w-full items-center">
          <ProductFilters
            filters={filters}
            setFilters={setFilters}
            clearAllFilters={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
            availableBrands={availableBrands}
          />
        </div>
        <div className="flex sm:hidden w-full flex-row-reverse items-center">
          <ProductFiltersMobile
            filters={filters}
            setFilters={setFilters}
            clearAllFilters={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
            availableBrands={availableBrands}
          />
        </div>
      </>
    );
  }

  function TeintProductsComponent(filteredMatches: Match[]) {
    return (
      <>
        <div className="flex-1 min-h-0 flex justify-center">
          <div className="flex flex-col gap-4 pb-4  mx-auto w-full items-center px-1 pt-8 sm:pt-4">
            {filteredMatches.map((match, index) => (
              <ProductTileHorizontalRanked
                key={`${match.description}-${index}`}
                product={{
                  id: match.product_id,
                  image: match.image,
                  brand: match.brand,
                  description: match.description,
                  type: match.type,
                  price: match.price,
                  availability: match.availability,
                  rank: index + 1,
                  product_id: match.product_id,
                  gtin: match.gtin,
                  features: match.features,
                }}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  function TeintTab() {
    return (
      <>
        {FiltersComponent(
          filters,
          setFilters,
          clearAllFilters,
          hasActiveFilters,
          availableBrands,
        )}
        {TeintProductsComponent(filteredMatches)}
        <div className="flex flex-col min-h-0">
          <div className="sm:flex justify-center mt-4 mb-2 flex-shrink-0 hidden">
            <DefaultButton
              size="medium"
              text={t('results.showCompleteLookButton')}
              handleClick={handleTabChange}
            />
          </div>
        </div>
      </>
    );
  }

  function BundleTab() {
    return BundleComponent(bundle, 'mobile');
  }

  return (
    <CloseLayout>
      <div className="h-full p-6 bg-background-default flex flex-col gap-4 overflow-y-scroll">
        <div className="flex-shrink-0">
          <div className="flex flex-col items-center">
            <Typography
              variant="h3"
              fontWeight={600}
              color="text.primary"
              className="mt-6 sm:pb-8 pb-4"
            >
              {t('results.title')}
            </Typography>
          </div>
        </div>
        <div className="flex flex-col mx-auto min-h-0  max-w-3xl">
          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              width: '100%',
              mb: 1,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              textColor="primary"
              indicatorColor="primary"
              centered
              sx={{
                '& .MuiTab-root': {
                  fontSize: { xs: '1rem', sm: '2rem' },
                  fontWeight: 500,
                },
              }}
            >
              <Tab label={t('results.tabTeint')} />
              <Tab label={t('results.tabCompleteLook')} />
            </Tabs>
          </Box>
          {activeTab === 0 && <TeintTab />}
          {activeTab === 1 && <BundleTab />}
        </div>

        <SmallLarge
          child_large={<QRCodeBanner link={window.location.href} />}
          child_small={<div />}
        />

        <ConfirmExitModal
          open={isConfirmExitOpen}
          onClose={handleCloseConfirmExit}
          onConfirmExit={handleOnConfirmExit}
        />
      </div>
    </CloseLayout>
  );
}

export default ResultsScreenVertical;
