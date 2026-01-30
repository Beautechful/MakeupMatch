import {
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  TextField,
  Box,
  Chip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';

import type { ClientData } from '../api/clients-db-api';

interface ClientsDataTableProps {
  data: ClientData[];
  loading?: boolean;
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: keyof ClientData | null;
  direction: SortDirection;
}

interface FilterConfig {
  search: string;
  browser: string;
  retailer: string;
  store: string;
  hasExitTimestamp: string;
  hasRecommendations: string;
}

const formatValue = (value: any, key: string): React.ReactNode => {
  if (value === null || value === undefined || value === '') {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }

  // Handle color hex values
  if (key.includes('hex')) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Box
          width={20}
          height={20}
          bgcolor={value}
          border="1px solid #ccc"
          borderRadius={1}
        />
        <Typography variant="body2" fontFamily="monospace">
          {value}
        </Typography>
      </Box>
    );
  }

  // Handle timestamps
  if (key.includes('timestamp') && value) {
    const date = new Date(value);
    return (
      <Typography variant="body2" fontFamily="monospace">
        {date.toLocaleDateString()} {date.toLocaleTimeString()}
      </Typography>
    );
  }

  // Handle rating display with stars
  if (key === 'feedback.rating' && typeof value === 'number') {
    const rating = Math.max(0, Math.min(5, Math.round(value)));
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <Box display="flex" alignItems="center">
          {[1, 2, 3, 4, 5].map((star) =>
            star <= rating ? (
              <StarIcon
                key={star}
                sx={{ fontSize: 16, color: 'warning.main' }}
              />
            ) : (
              <StarBorderIcon
                key={star}
                sx={{ fontSize: 16, color: 'action.disabled' }}
              />
            ),
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          ({rating}/5)
        </Typography>
      </Box>
    );
  }

  // Handle numbers with precision
  if (typeof value === 'number') {
    return (
      <Typography variant="body2" fontFamily="monospace">
        {value.toFixed(3)}
      </Typography>
    );
  }

  // Handle feedback improvements array
  if (key === 'feedback.improvements' && Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      );
    }

    const displayText = value.join(', ');
    if (displayText.length <= 50) {
      return (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {value.map((item, index) => (
            <Chip
              key={index}
              label={item}
              size="small"
              variant="outlined"
              color="primary"
            />
          ))}
        </Box>
      );
    }

    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Improvements Suggested:
            </Typography>
            {value.map((improvement, index) => (
              <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                • {improvement}
              </Typography>
            ))}
          </Box>
        }
        placement="top"
        arrow
      >
        <InfoIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
      </Tooltip>
    );
  }

  // Handle arrays/objects
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {value.map((item, index) => (
            <Chip
              key={index}
              label={
                typeof item === 'object'
                  ? item.brand || item.type || 'Item'
                  : item
              }
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      );
    }
    return (
      <Typography variant="body2" color="text.secondary">
        {JSON.stringify(value)}
      </Typography>
    );
  }

  // Handle feedback opinions with info icon for long text
  if (key === 'feedback.opinions' && typeof value === 'string') {
    if (value.length <= 50) {
      return <Typography variant="body2">{value}</Typography>;
    }

    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Customer Opinions:
            </Typography>
            <Typography variant="body2">{value}</Typography>
          </Box>
        }
        placement="top"
        arrow
      >
        <InfoIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
      </Tooltip>
    );
  }

  return <Typography variant="body2">{String(value)}</Typography>;
};

const getColumnDisplayName = (key: string): string => {
  const displayNames: Record<string, string> = {
    client_id: 'Client ID',
    'features.colors_lab.1.L': 'Color 1 - L',
    'features.colors_lab.1.a': 'Color 1 - a',
    'features.colors_lab.1.b': 'Color 1 - b',
    'features.colors_lab.2.L': 'Color 2 - L',
    'features.colors_lab.2.a': 'Color 2 - a',
    'features.colors_lab.2.b': 'Color 2 - b',
    'features.colors_lab.3.L': 'Color 3 - L',
    'features.colors_lab.3.a': 'Color 3 - a',
    'features.colors_lab.3.b': 'Color 3 - b',
    'features.colors_hex.1': 'Hex Color 1',
    'features.colors_hex.2': 'Hex Color 2',
    'features.colors_hex.3': 'Hex Color 3',
    'features.color_avg_lab.L': 'Avg Color - L',
    'features.color_avg_lab.a': 'Avg Color - a',
    'features.color_avg_lab.b': 'Avg Color - b',
    'features.color_avg_hex': 'Avg Hex Color',
    'user_flow.browser_name': 'Browser',
    'user_flow.retailer': 'Retailer',
    'user_flow.store_location': 'Store',
    'user_flow.clarity_id': 'Clarity ID',
    'user_flow.result_page_timestamp': 'Result Page Time',
    'user_flow.phone_page_results_timestamp': 'Phone Page Time',
    'user_flow.exit_timestamp': 'Exit Time',
    'recommendation_focus.filters': 'Applied Filters',
    'recommendation_focus.final_recommendations': 'Final Recommendations',
    'feedback.feedback_timestamp': 'Feedback Time',
    'feedback.rating': 'Rating',
    'feedback.improvements': 'Improvements',
    'feedback.opinions': 'Opinions',
  };

  return (
    displayNames[key] ||
    key.replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
};

export function ClientsDataTable({ data, loading }: ClientsDataTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });
  const [filters, setFilters] = useState<FilterConfig>({
    search: '',
    browser: '',
    retailer: '',
    store: '',
    hasExitTimestamp: '',
    hasRecommendations: '',
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Get all unique values for filter dropdowns
  const uniqueValues = useMemo(() => {
    const browsers = [
      ...new Set(
        data.map((item) => item['user_flow.browser_name']).filter(Boolean),
      ),
    ];
    const retailers = [
      ...new Set(
        data.map((item) => item['user_flow.retailer']).filter(Boolean),
      ),
    ];
    const stores = [
      ...new Set(
        data.map((item) => item['user_flow.store_location']).filter(Boolean),
      ),
    ];

    return { browsers, retailers, stores };
  }, [data]);

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        filters.search === '' ||
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(filters.search.toLowerCase()),
        );

      const matchesBrowser =
        filters.browser === '' ||
        item['user_flow.browser_name'] === filters.browser;

      const matchesRetailer =
        filters.retailer === '' ||
        item['user_flow.retailer'] === filters.retailer;

      const matchesStore =
        filters.store === '' ||
        item['user_flow.store_location'] === filters.store;

      const matchesExitTimestamp =
        filters.hasExitTimestamp === '' ||
        (filters.hasExitTimestamp === 'yes' &&
          item['user_flow.exit_timestamp']) ||
        (filters.hasExitTimestamp === 'no' &&
          !item['user_flow.exit_timestamp']);

      const matchesRecommendations =
        filters.hasRecommendations === '' ||
        (filters.hasRecommendations === 'yes' &&
          item['recommendation_focus.final_recommendations']?.length > 0) ||
        (filters.hasRecommendations === 'no' &&
          (!item['recommendation_focus.final_recommendations'] ||
            item['recommendation_focus.final_recommendations'].length === 0));

      return (
        matchesSearch &&
        matchesBrowser &&
        matchesRetailer &&
        matchesStore &&
        matchesExitTimestamp &&
        matchesRecommendations
      );
    });
  }, [data, filters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const handleSort = (key: keyof ClientData) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  const handleFilterChange = (key: keyof FilterConfig, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filters change
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when clearing filters
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      browser: '',
      retailer: '',
      store: '',
      hasExitTimestamp: '',
      hasRecommendations: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  // Get table columns from first row
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading clients data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Filters Section */}
      <Accordion
        expanded={filtersExpanded}
        onChange={() => setFiltersExpanded(!filtersExpanded)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <FilterListIcon />
            <Typography variant="h6">
              Filters
              {hasActiveFilters && (
                <Chip
                  label={`${filteredData.length} of ${data.length}`}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search all fields"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search clients..."
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Browser</InputLabel>
                <Select
                  value={filters.browser}
                  label="Browser"
                  onChange={(e) =>
                    handleFilterChange('browser', e.target.value)
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueValues.browsers.map((browser) => (
                    <MenuItem key={browser} value={browser}>
                      {browser}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Retailer</InputLabel>
                <Select
                  value={filters.retailer}
                  label="Retailer"
                  onChange={(e) =>
                    handleFilterChange('retailer', e.target.value)
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueValues.retailers.map((retailer) => (
                    <MenuItem key={retailer} value={retailer}>
                      {retailer}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Store</InputLabel>
                <Select
                  value={filters.store}
                  label="Store"
                  onChange={(e) => handleFilterChange('store', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueValues.stores.map((store) => (
                    <MenuItem key={store} value={store}>
                      {store}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Has Exit Time</InputLabel>
                <Select
                  value={filters.hasExitTimestamp}
                  label="Has Exit Time"
                  onChange={(e) =>
                    handleFilterChange('hasExitTimestamp', e.target.value)
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={1}>
              <Tooltip title="Clear all filters">
                <IconButton onClick={clearFilters} disabled={!hasActiveFilters}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Results Summary */}
      <Box
        py={2}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="body2" color="text.secondary">
          Showing {Math.min(page * rowsPerPage + 1, sortedData.length)}-
          {Math.min((page + 1) * rowsPerPage, sortedData.length)} of{' '}
          {sortedData.length} clients
          {sortedData.length !== data.length &&
            ` (filtered from ${data.length})`}
        </Typography>
      </Box>
      {/* Pagination Controls */}
      {sortedData.length > 0 && (
        <Paper sx={{ borderTop: 1, borderColor: 'divider' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
              <Typography variant="body2">Rows per page:</Typography>
              <Select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                size="small"
                sx={{ minWidth: 80 }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={250}>250</MenuItem>
              </Select>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1,
              }}
            >
              <Typography variant="body2">
                Page {page + 1} of {Math.ceil(sortedData.length / rowsPerPage)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => handleChangePage(null, 0)}
                  disabled={page === 0}
                >
                  First
                </Button>
                <Button
                  size="small"
                  onClick={() => handleChangePage(null, page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  onClick={() => handleChangePage(null, page + 1)}
                  disabled={
                    page >= Math.ceil(sortedData.length / rowsPerPage) - 1
                  }
                >
                  Next
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    handleChangePage(
                      null,
                      Math.ceil(sortedData.length / rowsPerPage) - 1,
                    )
                  }
                  disabled={
                    page >= Math.ceil(sortedData.length / rowsPerPage) - 1
                  }
                >
                  Last
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
      {/* Data Table */}
      <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 60, textAlign: 'center' }}>
                #
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column} sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={sortConfig.key === column}
                    direction={
                      sortConfig.key === column ? sortConfig.direction : 'asc'
                    }
                    onClick={() => handleSort(column as keyof ClientData)}
                  >
                    {getColumnDisplayName(column)}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ minWidth: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow key={row.client_id || index} hover>
                <TableCell
                  sx={{ py: 1, textAlign: 'center', fontWeight: 'bold' }}
                >
                  {sortedData.length - (page * rowsPerPage + index)}
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column} sx={{ py: 1 }}>
                    {formatValue(row[column as keyof ClientData], column)}
                  </TableCell>
                ))}
                <TableCell sx={{ py: 1 }}>
                  <Button
                    component={Link}
                    to={`/dev/client-detail/${row.client_id}`}
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      {sortedData.length > 0 && (
        <Paper sx={{ borderTop: 1, borderColor: 'divider' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
              <Typography variant="body2">Rows per page:</Typography>
              <Select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                size="small"
                sx={{ minWidth: 80 }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={250}>250</MenuItem>
              </Select>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1,
              }}
            >
              <Typography variant="body2">
                Page {page + 1} of {Math.ceil(sortedData.length / rowsPerPage)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => handleChangePage(null, 0)}
                  disabled={page === 0}
                >
                  First
                </Button>
                <Button
                  size="small"
                  onClick={() => handleChangePage(null, page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  onClick={() => handleChangePage(null, page + 1)}
                  disabled={
                    page >= Math.ceil(sortedData.length / rowsPerPage) - 1
                  }
                >
                  Next
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    handleChangePage(
                      null,
                      Math.ceil(sortedData.length / rowsPerPage) - 1,
                    )
                  }
                  disabled={
                    page >= Math.ceil(sortedData.length / rowsPerPage) - 1
                  }
                >
                  Last
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {sortedData.length === 0 && (
        <Box display="flex" justifyContent="center" p={4}>
          <Typography color="text.secondary">
            No clients match the current filters
          </Typography>
        </Box>
      )}
    </Box>
  );
}
