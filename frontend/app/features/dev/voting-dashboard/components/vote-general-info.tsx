import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useRankingQuery } from '../hooks/use-ranking';

interface RankingItem {
  image_id: string;
  shown_count: number;
  win_count: number;
  comparison_count: number;
  last_shown_at: string;
  performance_score: number;
}

export default function VoteGeneralInfo() {
  const [shouldFetch, setShouldFetch] = useState(false);
  const { data, isLoading, error, refetch } = useRankingQuery(shouldFetch);

  const handleFetchRanking = async () => {
    setShouldFetch(true);
    await refetch();
  };

  const calculateStats = (rankings: RankingItem[]) => {
    if (!rankings || rankings.length === 0) {
      return {
        totalShownCount: 0,
        totalComparisonCount: 0,
        maxWinCount: 0,
        latestShownAt: null,
      };
    }

    const totalShownCount = rankings.reduce(
      (sum, item) => sum + item.shown_count,
      0,
    );
    const totalComparisonCount = rankings.reduce(
      (sum, item) => sum + item.comparison_count,
      0,
    );
    const maxWinCount = Math.max(...rankings.map((item) => item.win_count));
    const latestShownAt = rankings.reduce(
      (latest, item) => {
        const itemDate = new Date(item.last_shown_at);
        return !latest || itemDate > latest ? itemDate : latest;
      },
      null as Date | null,
    );

    return {
      totalShownCount,
      totalComparisonCount,
      maxWinCount,
      latestShownAt,
    };
  };

  const stats = data ? calculateStats(data) : null;

  return (
    <Box pt={2}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleFetchRanking}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
      >
        {isLoading ? 'Fetching...' : 'Fetch Ranking Data'}
      </Button>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error:{' '}
          {error instanceof Error ? error.message : 'Failed to fetch data'}
        </Typography>
      )}

      {stats && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            General Voting Statistics
          </Typography>
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Submited Votes
              </Typography>
              <Typography variant="h4" color="primary">
                {(stats.totalComparisonCount / 2).toLocaleString()}
              </Typography>
            </Paper>

            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Shown Voting Pages
              </Typography>
              <Typography variant="h4" color="primary">
                {(stats.totalShownCount / 2).toLocaleString()}
              </Typography>
            </Paper>

            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Highest Win Count
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.maxWinCount.toLocaleString()}
              </Typography>
            </Paper>

            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Latest Activity
              </Typography>
              <Typography variant="h6" color="text.primary">
                {stats.latestShownAt
                  ? stats.latestShownAt.toLocaleString()
                  : 'N/A'}
              </Typography>
            </Paper>
          </Box>

          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              Total ranking entries: {data.length}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
