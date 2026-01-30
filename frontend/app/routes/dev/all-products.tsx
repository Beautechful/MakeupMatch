import {
  Search as SearchIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Launch as LaunchIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import {
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Link,
  Tooltip,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  TableSortLabel,
} from '@mui/material';
import { useState, useMemo } from 'react';

import type {
  ProductData,
  GetAllProductsRequest,
} from '~/features/products/api/products-api';
import { useGetAllProducts } from '~/features/products/hooks/use-products';

export function meta() {
  return [
    { title: 'All Products - Makeup Match' },
    {
      name: 'description',
      content: 'View and search all products from the database',
    },
  ];
}

interface Filters {
  brandFilter: string;
  typeFilter: string;
  availabilityFilter: 'all' | 'instore' | 'online' | 'both';
  rescannedFilter: 'all' | 'yes' | 'no';
}

type SortField =
  | 'brand'
  | 'type'
  | 'price'
  | 'match_percentage'
  | 'stock_level';
type SortOrder = 'asc' | 'desc';

export default function AllProductsPage() {
  const [requestParams, setRequestParams] = useState<GetAllProductsRequest>({
    store_name: 'dm',
    store_location: 'D522',
    length: 600,
    target_color: [58.434548, 12.00065, 15.919674],
  });

  const [filters, setFilters] = useState<Filters>({
    brandFilter: '',
    typeFilter: '',
    availabilityFilter: 'all',
    rescannedFilter: 'all',
  });

  const [sortField, setSortField] = useState<SortField>('match_percentage');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const getAllProductsMutation = useGetAllProducts();
  const rawProducts = getAllProductsMutation.data?.products || [];
  const isLoading = getAllProductsMutation.isPending;
  const error = getAllProductsMutation.error;

  const handleSearch = () => {
    getAllProductsMutation.mutate(requestParams);
  };

  const handleParamChange = (
    field: keyof GetAllProductsRequest,
    value: any,
  ) => {
    setRequestParams((prev) => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (index: number, value: string) => {
    const newColor = [...requestParams.target_color] as [
      number,
      number,
      number,
    ];
    newColor[index] = parseFloat(value) || 0;
    setRequestParams((prev) => ({ ...prev, target_color: newColor }));
  };

  const isRescanned = (product: ProductData) => {
    return Object.keys(product.history).length > 0;
  };

  // Get unique values for filter options
  const uniqueBrands = useMemo(() => {
    return Array.from(
      new Set(rawProducts.map((p) => p.product_brand_name)),
    ).sort();
  }, [rawProducts]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(rawProducts.map((p) => p.type))).sort();
  }, [rawProducts]);

  // Filter and sort products
  const products = useMemo(() => {
    const filtered = rawProducts.filter((product) => {
      // Brand filter
      if (
        filters.brandFilter &&
        product.product_brand_name !== filters.brandFilter
      ) {
        return false;
      }

      // Type filter
      if (filters.typeFilter && product.type !== filters.typeFilter) {
        return false;
      }

      // Availability filter
      if (filters.availabilityFilter !== 'all') {
        if (filters.availabilityFilter === 'instore' && !product.instore_status)
          return false;
        if (filters.availabilityFilter === 'online' && !product.online_status)
          return false;
        if (
          filters.availabilityFilter === 'both' &&
          !(product.instore_status && product.online_status)
        )
          return false;
      }

      // Rescanned filter
      if (filters.rescannedFilter !== 'all') {
        const hasHistory = isRescanned(product);
        if (filters.rescannedFilter === 'yes' && !hasHistory) return false;
        if (filters.rescannedFilter === 'no' && hasHistory) return false;
      }

      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'brand':
          aValue = a.product_brand_name;
          bValue = b.product_brand_name;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'price':
          aValue = parseFloat(a.price.replace(/[^\d.-]/g, ''));
          bValue = parseFloat(b.price.replace(/[^\d.-]/g, ''));
          break;
        case 'match_percentage':
          aValue = parseFloat(a.match_percentage.replace('%', ''));
          bValue = parseFloat(b.match_percentage.replace('%', ''));
          break;
        case 'stock_level':
          aValue = a.stock_level;
          bValue = b.stock_level;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [rawProducts, filters, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleFilterChange = (filterField: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterField]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      brandFilter: '',
      typeFilter: '',
      availabilityFilter: 'all',
      rescannedFilter: 'all',
    });
  };

  const renderHistoryTooltip = (product: ProductData) => {
    if (!isRescanned(product)) return null;

    const historyEntries = Object.entries(product.history);
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Rescan History
        </Typography>
        {historyEntries.map(([date, data]) => (
          <Box key={date} sx={{ mb: 1 }}>
            <Typography variant="body2">
              <strong>{new Date(date).toLocaleDateString()}</strong>
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  backgroundColor: data.color_hex,
                  border: '1px solid #ccc',
                  borderRadius: '2px',
                }}
              />
              <Typography variant="caption">{data.color_hex}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              LAB: {data.color_lab.map((v) => v.toFixed(1)).join(', ')}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        All Products
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Search and view all products from the database with detailed information
      </Typography>

      {/* Search Parameters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search Parameters
        </Typography>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Store Name"
              value={requestParams.store_name}
              onChange={(e) => handleParamChange('store_name', e.target.value)}
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Store Location"
              value={requestParams.store_location}
              onChange={(e) =>
                handleParamChange('store_location', e.target.value)
              }
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Length"
              type="number"
              value={requestParams.length}
              onChange={(e) =>
                handleParamChange('length', parseInt(e.target.value) || 0)
              }
              size="small"
              sx={{ flex: 1 }}
            />
          </Stack>

          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Target Color (LAB)
            </Typography>
            <Stack direction="row" spacing={2}>
              {requestParams.target_color.map((value, index) => (
                <TextField
                  key={index}
                  label={['L', 'a', 'b'][index]}
                  type="number"
                  value={value}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  size="small"
                  inputProps={{ step: 0.000001 }}
                />
              ))}
            </Stack>
          </Box>

          <Box>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={isLoading}
            >
              Search Products
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Filters and Sorting */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Filters & Sorting</Typography>
          <Button
            variant="text"
            startIcon={
              showFilters ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />
            }
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </Box>

        <Collapse in={showFilters}>
          <Stack spacing={3}>
            {/* Filter Controls */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Filters
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Brand</InputLabel>
                  <Select
                    value={filters.brandFilter}
                    label="Brand"
                    onChange={(e) =>
                      handleFilterChange('brandFilter', e.target.value)
                    }
                  >
                    <MenuItem value="">All Brands</MenuItem>
                    {uniqueBrands.map((brand) => (
                      <MenuItem key={brand} value={brand}>
                        {brand}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filters.typeFilter}
                    label="Type"
                    onChange={(e) =>
                      handleFilterChange('typeFilter', e.target.value)
                    }
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {uniqueTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Availability</InputLabel>
                  <Select
                    value={filters.availabilityFilter}
                    label="Availability"
                    onChange={(e) =>
                      handleFilterChange('availabilityFilter', e.target.value)
                    }
                  >
                    <MenuItem value="all">All Products</MenuItem>
                    <MenuItem value="instore">In Store Only</MenuItem>
                    <MenuItem value="online">Online Only</MenuItem>
                    <MenuItem value="both">Both Store & Online</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Rescanned</InputLabel>
                  <Select
                    value={filters.rescannedFilter}
                    label="Rescanned"
                    onChange={(e) =>
                      handleFilterChange('rescannedFilter', e.target.value)
                    }
                  >
                    <MenuItem value="all">All Products</MenuItem>
                    <MenuItem value="yes">Rescanned Only</MenuItem>
                    <MenuItem value="no">Not Rescanned</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={clearAllFilters}
                  size="small"
                >
                  Clear Filters
                </Button>
              </Stack>
            </Box>

            {/* Sorting Controls */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Sorting
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortField}
                    label="Sort By"
                    onChange={(e) => setSortField(e.target.value as SortField)}
                  >
                    <MenuItem value="match_percentage">
                      Match Percentage
                    </MenuItem>
                    <MenuItem value="brand">Brand</MenuItem>
                    <MenuItem value="type">Type</MenuItem>
                    <MenuItem value="price">Price</MenuItem>
                    <MenuItem value="stock_level">Stock Level</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={sortOrder}
                    label="Order"
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          </Stack>
        </Collapse>
      </Paper>

      {/* Loading */}
      {isLoading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error.message}
        </Alert>
      )}

      {/* Results Summary */}
      {rawProducts.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6">
              Showing {products.length} of {rawProducts.length} products
            </Typography>
            <Stack direction="row" spacing={3} mt={1}>
              <Typography variant="body2" color="text.secondary">
                {products.filter((p) => isRescanned(p)).length} rescanned
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {products.filter((p) => p.instore_status).length} in store
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {products.filter((p) => p.online_status).length} online
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {
                  uniqueBrands.filter((brand) =>
                    products.some((p) => p.product_brand_name === brand),
                  ).length
                }{' '}
                brands
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      {products.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'brand'}
                    direction={sortField === 'brand' ? sortOrder : 'asc'}
                    onClick={() => handleSort('brand')}
                  >
                    Brand
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'type'}
                    direction={sortField === 'type' ? sortOrder : 'asc'}
                    onClick={() => handleSort('type')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'price'}
                    direction={sortField === 'price' ? sortOrder : 'asc'}
                    onClick={() => handleSort('price')}
                  >
                    Price
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'match_percentage'}
                    direction={
                      sortField === 'match_percentage' ? sortOrder : 'asc'
                    }
                    onClick={() => handleSort('match_percentage')}
                  >
                    Match %
                  </TableSortLabel>
                </TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Availability</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'stock_level'}
                    direction={sortField === 'stock_level' ? sortOrder : 'asc'}
                    onClick={() => handleSort('stock_level')}
                  >
                    Stock
                  </TableSortLabel>
                </TableCell>
                <TableCell>Rescanned</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.product_id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        src={product.product_image}
                        alt={product.product_description}
                        sx={{ width: 40, height: 40 }}
                        variant="rounded"
                      />
                      <Box>
                        <Typography variant="body2" sx={{ maxWidth: 300 }}>
                          {product.product_description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {product.product_id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {product.product_brand_name}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={product.type}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {product.price}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      color="success.main"
                      fontWeight="medium"
                    >
                      {product.match_percentage}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          backgroundColor: product.color_hex,
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                        }}
                      />
                      <Typography variant="caption">
                        {product.color_hex}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        icon={
                          product.instore_status ? (
                            <CheckCircleIcon />
                          ) : (
                            <CancelIcon />
                          )
                        }
                        label="Store"
                        size="small"
                        color={product.instore_status ? 'success' : 'error'}
                        variant="outlined"
                      />
                      <Chip
                        icon={
                          product.online_status ? (
                            <CheckCircleIcon />
                          ) : (
                            <CancelIcon />
                          )
                        }
                        label="Online"
                        size="small"
                        color={product.online_status ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {product.stock_level}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {isRescanned(product) ? (
                      <Tooltip
                        title={renderHistoryTooltip(product)}
                        arrow
                        placement="left"
                      >
                        <Chip
                          icon={<HistoryIcon />}
                          label="Yes"
                          size="small"
                          color="info"
                          sx={{ cursor: 'pointer' }}
                        />
                      </Tooltip>
                    ) : (
                      <Chip label="No" size="small" variant="outlined" />
                    )}
                  </TableCell>

                  <TableCell>
                    <IconButton
                      component={Link}
                      href={product.product_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      <LaunchIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Empty State */}
      {!isLoading && products.length === 0 && !error && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No products found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the search form above to find products
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
