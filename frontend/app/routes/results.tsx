import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import { ResultLayout } from '~/components/layouts/result-layout';
import { useGetBundle } from '~/features/bundle/hooks/use-get-bundle';
import LoadingScreen from '~/features/loading-screen/loading-screen';
import { useGetResultsByUserId } from '~/features/results/hooks/use-results-hook';
import ResultsScreenVertical from '~/features/results/results-screen-vertical';
import { translateProductsToMatches } from '~/features/results/utils/result-translate';

const mockAnalysisResults = [
  { label: 'Skin Tone', value: 'Fair' },
  { label: 'Undertone', value: 'Cool' },
  { label: 'Skin Type', value: 'Dry' },
];

const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const {
    mutate: fetchResults,
    data: dataTeint,
    isPending: isPendingTeint,
  } = useGetResultsByUserId();
  const {
    mutate: fetchBundle,
    data: dataBundle,
    isPending: isPendingBundle,
  } = useGetBundle();

  useEffect(() => {
    if (userId) {
      fetchResults(userId);
    }
  }, [fetchResults, userId]);

  useEffect(() => {
    if (userId) {
      fetchBundle({ user_id: userId, product_id: '' });
    }
  }, [fetchBundle, userId]);

  if (isPendingTeint || !dataTeint || isPendingBundle || !dataBundle) {
    return <LoadingScreen />;
  }

  const matches = translateProductsToMatches(dataTeint.products);

  return (
    <ResultLayout userId={dataTeint.user_id}>
      <ResultsScreenVertical
        analysisResults={mockAnalysisResults}
        topMatches={matches}
        bundle={dataBundle}
      />
    </ResultLayout>
  );
};

export default ResultsPage;
