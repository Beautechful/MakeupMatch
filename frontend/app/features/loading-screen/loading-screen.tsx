import React from 'react';

import { Loading } from '../../components/ui/loading';

/**
 * LoadingScreen Component
 * This component serves as a full-screen loading screen, ideal for use as a HydrateFallback.
 */
interface LoadingScreenProps {
  forceScreenSize?: boolean;
}

export function LoadingScreen({ forceScreenSize = true }: LoadingScreenProps) {
  return (
    <div
      className={`flex items-center justify-center w-screen ${forceScreenSize ? 'h-screen' : 'h-full'} bg-gray-100`}
      aria-label="Loading Screen"
    >
      <Loading size="large" />
    </div>
  );
}

export default LoadingScreen;
