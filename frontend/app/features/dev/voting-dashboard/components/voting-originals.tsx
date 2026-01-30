import {
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useOriginalsQuery } from '../hooks/use-originals';

function OriginalTileDisplay({ tile }: { tile: any }) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  return (
    <Box>
      {tile.url ? (
        <Box mb={2} display="flex" justifyContent="center">
          <img
            src={tile.url}
            alt={tile.description ?? `Original ${tile.id}`}
            style={{
              maxWidth: '100%',
              maxHeight: 300,
              objectFit: 'contain',
              borderRadius: 8,
            }}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                '/placeholder-image.png';
            }}
          />
        </Box>
      ) : (
        <Box
          mb={2}
          sx={{
            width: '100%',
            height: 200,
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">No image available</Typography>
        </Box>
      )}
      <Box display="flex" alignItems="center" mb={1} gap={1}>
        <Typography variant="subtitle1">Tile ID:</Typography>
        <Typography
          variant="subtitle1"
          component="span"
          sx={{
            color: '#1976d2',
            fontFamily: 'monospace',
            cursor: 'pointer',
            userSelect: 'all',
            textDecoration: 'underline',
            '&:hover': {
              color: '#1565c0',
              textDecoration: 'underline',
            },
            '&:active': {
              color: '#0d47a1',
            },
          }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(String(tile.id));
              setSnackbarOpen(true);
            } catch (err) {
              console.error('Failed to copy tile id', err);
            }
          }}
          title="Click to copy ID"
        >
          {tile.id}
        </Typography>
      </Box>
      <Typography variant="body2">Description: {tile.description}</Typography>
      {/* Add more fields as necessary */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="ID copied"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

function OriginalsDataDisplay({ data }: { data: any }) {
  const dataString = JSON.stringify(data, null, 2);
  const isArray = Array.isArray(data.originals);
  if (isArray) {
    return (
      <Box
        mt={2}
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))"
        gap={4}
      >
        {data.originals.map((tile: any) => (
          <OriginalTileDisplay key={tile.id} tile={tile} />
        ))}
      </Box>
    );
  }
  return <Box mt={2}>{dataString}</Box>;
}

export default function VotingOriginals() {
  const { data, isLoading, error, refetch } = useOriginalsQuery();

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <Box pt={2}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleRefresh}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
      >
        {isLoading ? 'Fetching...' : 'Refresh Originals Data'}
      </Button>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error:{' '}
          {error instanceof Error ? error.message : 'Failed to fetch data'}
        </Typography>
      )}

      {data && (
        <>
          <OriginalsDataDisplay data={data} />
        </>
      )}
    </Box>
  );
}
