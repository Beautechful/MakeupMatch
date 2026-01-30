import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useRankingQuery } from '../hooks/use-ranking';
import { useVariantsQuery } from '../hooks/use-variants';

import TileDetailModal from './tile-detail-modal';

function VariantsTileDisplay({
  tile,
  rankingData,
}: {
  tile: any;
  rankingData?: any;
}) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const isHidden = tile.hidden === true;

  return (
    <Box position="relative">
      {/* Traffic light indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: isHidden ? 'error.main' : 'success.main',
          border: '2px solid white',
          boxShadow: 2,
          zIndex: 1,
        }}
        title={isHidden ? 'Hidden' : 'Visible'}
      />
      {tile.url ? (
        <Box
          mb={2}
          display="flex"
          justifyContent="center"
          onClick={() => setModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setModalOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
          sx={{ cursor: 'pointer' }}
        >
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
      <Typography variant="body2">{tile.makeup_style_description}</Typography>
      {rankingData && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            Shown: {rankingData.comparison_count} | Score:{' '}
            {rankingData.performance_score?.toFixed(2) || 0}
          </Typography>
        </Box>
      )}
      {/* Add more fields as necessary */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="ID copied"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <TileDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tile={tile}
        rankingData={rankingData}
      />
    </Box>
  );
}

function VariantsDataDisplay({
  data,
  rankingData,
}: {
  data: any;
  rankingData?: any[];
}) {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [groupsPerPage, setGroupsPerPage] = useState(2);
  const [showOnlyVisible, setShowOnlyVisible] = useState(true);
  const [groupBy, setGroupBy] = useState<string>('none');
  const [sortBy, setSortBy] = useState<string>('none');
  const [filterMakeupStyle, setFilterMakeupStyle] = useState<string>('all');
  const [filterOriginalId, setFilterOriginalId] = useState<string>('all');
  const dataString = JSON.stringify(data, null, 2);
  const isArray = Array.isArray(data.variants);

  // Create a map of ranking data by image_id for quick lookup
  const rankingMap = new Map<string, any>();
  if (rankingData) {
    rankingData.forEach((item) => {
      rankingMap.set(item.image_id, item);
    });
  }

  if (isArray) {
    const totalVariants = data.variants.length;
    const visibleVariants = data.variants.filter(
      (v: any) => v.hidden !== true,
    ).length;

    // Get unique values for filters
    const uniqueMakeupStyles = Array.from(
      new Set(
        data.variants
          .map((v: any) => v.makeup_style_description)
          .filter(Boolean),
      ),
    ).sort() as string[];

    const uniqueOriginalIds = Array.from(
      new Set(data.variants.map((v: any) => v.original_id).filter(Boolean)),
    ).sort() as string[];

    // Apply filters
    let filteredVariants = showOnlyVisible
      ? data.variants.filter((v: any) => v.hidden !== true)
      : data.variants;

    if (filterMakeupStyle !== 'all') {
      filteredVariants = filteredVariants.filter(
        (v: any) => v.makeup_style_description === filterMakeupStyle,
      );
    }

    if (filterOriginalId !== 'all') {
      filteredVariants = filteredVariants.filter(
        (v: any) => v.original_id === filterOriginalId,
      );
    }

    // Apply sorting
    if (sortBy !== 'none') {
      filteredVariants = [...filteredVariants].sort((a: any, b: any) => {
        const aVal = a[sortBy] || '';
        const bVal = b[sortBy] || '';
        return aVal.toString().localeCompare(bVal.toString());
      });
    }

    // Apply grouping
    const groupedVariants: { [key: string]: any[] } = {};
    if (groupBy !== 'none') {
      filteredVariants.forEach((variant: any) => {
        const key = variant[groupBy] || 'Unknown';
        if (!groupedVariants[key]) {
          groupedVariants[key] = [];
        }
        groupedVariants[key].push(variant);
      });
    }

    const isGrouped = groupBy !== 'none';
    const sortedGroupKeys = Object.keys(groupedVariants).sort();

    // Pagination for groups or items
    const totalPages = isGrouped
      ? Math.ceil(sortedGroupKeys.length / groupsPerPage)
      : Math.ceil(filteredVariants.length / itemsPerPage);

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const groupStartIndex = (page - 1) * groupsPerPage;
    const groupEndIndex = groupStartIndex + groupsPerPage;
    const currentPageGroupKeys = sortedGroupKeys.slice(
      groupStartIndex,
      groupEndIndex,
    );

    const currentPageVariants = isGrouped
      ? filteredVariants
      : filteredVariants.slice(startIndex, endIndex);

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
      setItemsPerPage(newItemsPerPage);
      setPage(1); // Reset to first page when changing items per page
    };

    const handleFilterChange = (checked: boolean) => {
      setShowOnlyVisible(checked);
      setPage(1); // Reset to first page when changing filter
    };

    const handleGroupByChange = (value: string) => {
      setGroupBy(value);
      setPage(1);
    };

    const handleSortByChange = (value: string) => {
      setSortBy(value);
      setPage(1);
    };

    const handleGroupsPerPageChange = (value: number) => {
      setGroupsPerPage(value);
      setPage(1);
    };

    const handleMakeupStyleFilterChange = (value: string) => {
      setFilterMakeupStyle(value);
      setPage(1);
    };

    const handleOriginalIdFilterChange = (value: string) => {
      setFilterOriginalId(value);
      setPage(1);
    };

    return (
      <Box mt={2}>
        {/* Statistics */}
        <Box
          mb={3}
          p={2}
          sx={{
            bgcolor: 'primary.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'primary.200',
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Variants Statistics</Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showOnlyVisible}
                  onChange={(e) => handleFilterChange(e.target.checked)}
                  color="primary"
                />
              }
              label="Show only visible"
            />
          </Box>
          <Box display="flex" gap={4}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                }}
              />
              <Typography variant="body1">
                <strong>{visibleVariants}</strong> Visible
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                }}
              />
              <Typography variant="body1">
                <strong>{totalVariants - visibleVariants}</strong> Hidden
              </Typography>
            </Box>
            <Typography variant="body1">
              <strong>{totalVariants}</strong> Total
            </Typography>
          </Box>
        </Box>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          flexWrap="wrap"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="body1">
              {isGrouped
                ? `Showing ${groupStartIndex + 1}-${Math.min(groupEndIndex, sortedGroupKeys.length)} of ${sortedGroupKeys.length} groups`
                : `Showing ${startIndex + 1}-${Math.min(endIndex, filteredVariants.length)} of ${filteredVariants.length} variants`}
              {showOnlyVisible && ' (filtered)'}
            </Typography>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Group By</InputLabel>
              <Select
                value={groupBy}
                label="Group By"
                onChange={(e) => handleGroupByChange(e.target.value)}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="original_id">Original ID</MenuItem>
                <MenuItem value="makeup_style_description">
                  Makeup Style
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => handleSortByChange(e.target.value)}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="original_id">Original ID</MenuItem>
                <MenuItem value="makeup_style_description">
                  Makeup Style
                </MenuItem>
                <MenuItem value="created_at">Created Date</MenuItem>
              </Select>
            </FormControl>

            {!isGrouped && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Per Page</InputLabel>
                <Select
                  value={itemsPerPage}
                  label="Per Page"
                  onChange={(e) =>
                    handleItemsPerPageChange(Number(e.target.value))
                  }
                >
                  <MenuItem value={10}>10 per page</MenuItem>
                  <MenuItem value={20}>20 per page</MenuItem>
                  <MenuItem value={50}>50 per page</MenuItem>
                  <MenuItem value={100}>100 per page</MenuItem>
                </Select>
              </FormControl>
            )}

            {isGrouped && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Groups Per Page</InputLabel>
                <Select
                  value={groupsPerPage}
                  label="Groups Per Page"
                  onChange={(e) =>
                    handleGroupsPerPageChange(Number(e.target.value))
                  }
                >
                  <MenuItem value={1}>1 group</MenuItem>
                  <MenuItem value={2}>2 groups</MenuItem>
                  <MenuItem value={5}>5 groups</MenuItem>
                  <MenuItem value={10}>10 groups</MenuItem>
                  <MenuItem value={999999}>All groups</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          )}
        </Box>

        {/* Filters Row */}
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Makeup Style</InputLabel>
            <Select
              value={filterMakeupStyle}
              label="Filter by Makeup Style"
              onChange={(e) => handleMakeupStyleFilterChange(e.target.value)}
            >
              <MenuItem value="all">All Makeup Styles</MenuItem>
              {uniqueMakeupStyles.map((style) => (
                <MenuItem key={style} value={style}>
                  {style}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Original ID</InputLabel>
            <Select
              value={filterOriginalId}
              label="Filter by Original ID"
              onChange={(e) => handleOriginalIdFilterChange(e.target.value)}
            >
              <MenuItem value="all">All Original IDs</MenuItem>
              {uniqueOriginalIds.map((id) => (
                <MenuItem key={id} value={id}>
                  {id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {isGrouped ? (
          <Box>
            {currentPageGroupKeys.map((groupKey) => (
              <Box key={groupKey} mb={4}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    pb: 1,
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                  }}
                >
                  {groupBy === 'original_id' ? 'Original ID' : 'Makeup Style'}:{' '}
                  {groupKey} ({groupedVariants[groupKey].length})
                </Typography>
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))"
                  gap={4}
                >
                  {groupedVariants[groupKey].map((tile: any) => (
                    <VariantsTileDisplay
                      key={tile.id}
                      tile={tile}
                      rankingData={rankingMap.get(tile.id)}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            display="grid"
            gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))"
            gap={4}
          >
            {currentPageVariants.map((tile: any) => (
              <VariantsTileDisplay
                key={tile.id}
                tile={tile}
                rankingData={rankingMap.get(tile.id)}
              />
            ))}
          </Box>
        )}
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Box>
    );
  }
  return <Box mt={2}>{dataString}</Box>;
}

export default function VotingVariants() {
  const { data, isLoading, error, refetch } = useVariantsQuery();
  const [shouldFetchRanking, setShouldFetchRanking] = useState(false);
  const {
    data: rankingData,
    isLoading: isLoadingRanking,
    error: rankingError,
    refetch: refetchRanking,
  } = useRankingQuery(shouldFetchRanking);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleFetchRanking = async () => {
    setShouldFetchRanking(true);
    await refetchRanking();
  };

  return (
    <Box pt={2}>
      <Box display="flex" gap={2} mb={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleRefresh}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
        >
          {isLoading ? 'Fetching...' : 'Refresh Variants Data'}
        </Button>

        <Button
          variant="contained"
          color="secondary"
          onClick={handleFetchRanking}
          disabled={isLoadingRanking}
          startIcon={
            isLoadingRanking ? <CircularProgress size={20} /> : undefined
          }
        >
          {isLoadingRanking ? 'Fetching...' : 'Fetch Voting Data'}
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error:{' '}
          {error instanceof Error ? error.message : 'Failed to fetch data'}
        </Typography>
      )}

      {rankingError && (
        <Typography color="error" sx={{ mt: 2 }}>
          Ranking Error:{' '}
          {rankingError instanceof Error
            ? rankingError.message
            : 'Failed to fetch ranking data'}
        </Typography>
      )}

      {data && (
        <>
          <VariantsDataDisplay data={data} rankingData={rankingData} />
        </>
      )}
    </Box>
  );
}
