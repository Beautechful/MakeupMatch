import { Box, Dialog, DialogContent, Typography } from '@mui/material';

interface TileDetailModalProps {
  open: boolean;
  onClose: () => void;
  tile: any;
  rankingData?: any;
}

export default function TileDetailModal({
  open,
  onClose,
  tile,
  rankingData,
}: TileDetailModalProps) {
  if (!tile) return null;

  // Combine tile and ranking data for display
  const combinedData = rankingData ? { ...tile, ranking: rankingData } : tile;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogContent>
        <Box display="flex" gap={3} height="100%">
          {/* Left side - Image */}
          <Box
            flex="0 0 50%"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            sx={{
              bgcolor: 'grey.50',
              borderRadius: 1,
              p: 2,
            }}
          >
            {tile.url ? (
              <img
                src={tile.url}
                alt={tile.description ?? `Tile ${tile.id}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    '/placeholder-image.png';
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: 400,
                  bgcolor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No image available
                </Typography>
              </Box>
            )}
          </Box>

          {/* Right side - JSON Data */}
          <Box
            flex="0 0 50%"
            display="flex"
            flexDirection="column"
            sx={{ overflow: 'hidden' }}
          >
            <Typography variant="h6" mb={2}>
              Tile Data
            </Typography>
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                bgcolor: 'grey.900',
                color: 'grey.100',
                p: 2,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
              }}
            >
              {JSON.stringify(combinedData, null, 2)}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
