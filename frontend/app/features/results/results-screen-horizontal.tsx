import { Typography } from '@mui/material';
import React from 'react';

import { NavButton } from '~/components/ui/nav-button';
import ProductTile from '~/features/results/components/product-tile';
import type { Match } from '~/features/results/types';

interface ResultsScreenHorizontalProps {
  analysisResults: { label: string; value: string }[];
  topMatches: Match[];
}

export function ResultsScreenHorizontal({
  analysisResults,
  topMatches,
}: ResultsScreenHorizontalProps) {
  return (
    <div className="p-6 bg-background-default flex flex-col gap-6">
      {/* Analysis Results Section */}
      <div>
        <Typography
          variant="h6"
          fontWeight={600}
          color="text.primary"
          className="mb-4"
        >
          Your analysis results
        </Typography>
        <div className="flex gap-4">
          {analysisResults.map((result, index) => (
            <div
              key={index}
              className="flex flex-col items-center bg-background-paper p-4 rounded-lg shadow-sm"
            >
              <Typography variant="body1" fontWeight={500} color="text.primary">
                {result.value}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                className="italic"
              >
                {result.label}
              </Typography>
            </div>
          ))}
        </div>
      </div>

      {/* Top Matches Section */}
      <div>
        <Typography
          variant="h6"
          fontWeight={600}
          color="text.primary"
          className="mb-4"
        >
          Your Top Matches
        </Typography>
        <div className="flex gap-4 overflow-x-auto">
          {topMatches.map((match, index) => (
            <div
              key={index}
              className="flex-shrink-0"
              // style={{ width: '300px' }}
            >
              <ProductTile
                match={{
                  image: match.image,
                  brand: match.brand,
                  description: match.description,
                  type: match.type,
                  price: match.price,
                  availability: match.availability,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Send Results Button */}
      <div className="flex justify-center mt-6">
        <NavButton text="Exit the analysis" url="/" />
      </div>
    </div>
  );
}

export default ResultsScreenHorizontal;
