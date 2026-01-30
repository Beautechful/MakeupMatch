import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { BundleLayout } from '~/components/layouts/bundle-layout';
import { CloseLayout } from '~/components/layouts/close-layout';
import { BundleScreen } from '~/features/bundle/bundle-screen';
import { useGetBundle } from '~/features/bundle/hooks/use-get-bundle';
import LoadingScreen from '~/features/loading-screen/loading-screen';

export default function Bundle() {
  const { mutate: fetchBundle, data, isPending } = useGetBundle();
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (productId && userId) {
      fetchBundle({ user_id: userId, product_id: productId });
    }
  }, [fetchBundle, productId, userId]);

  if (isPending || !userId || !data) {
    return <LoadingScreen />;
  }

  return (
    <CloseLayout>
      <BundleLayout userId={userId}>
        <BundleScreen bundle={data} />
      </BundleLayout>
    </CloseLayout>
  );
}
