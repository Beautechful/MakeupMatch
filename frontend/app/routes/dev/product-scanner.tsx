import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { ColorSensorProvider, useScanColor } from '~/context/color-sensor';
import { useApi } from '~/hooks/use-api';

export function meta() {
  return [
    { title: 'Product Scanner - Makeup Match' },
    { name: 'description', content: 'Product database scanner and editor' },
  ];
}

interface Product {
  product_id?: string;
  brand: string;
  title: string;
  price: number;
  color_hex?: string;
  color_lab?: number[];
  type: string;
  store_brand?: string;
  gtin?: string;
  dan?: string;
  code?: string;
  retailers?: Record<string, any>;
}

interface SearchFilters {
  store_brand: string;
  brand: string;
  name: string;
  gtin: string;
  limit: number;
}

function ProductScanner() {
  const api = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [storeBrands, setStoreBrands] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    store_brand: '',
    brand: '',
    name: '',
    gtin: '',
    limit: 50,
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProductData, setNewProductData] = useState<Partial<Product>>({});
  const [newColorData, setNewColorData] = useState<{
    hex: string;
    lab: number[];
  } | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const {
    trigger: scanColor,
    data: scanResult,
    isPending: isScanning,
  } = useScanColor();

  useEffect(() => {
    fetchStoreBrands();
  }, []);

  useEffect(() => {
    if (scanResult) {
      setNewColorData({
        hex: scanResult.hex_value,
        lab: scanResult.values,
      });
    }
  }, [scanResult]);

  const fetchStoreBrands = async () => {
    try {
      const data = await api.get<string[]>('/store_brands');
      setStoreBrands(data);
    } catch (error) {
      console.error('Failed to fetch store brands:', error);
    }
  };

  const searchProducts = async () => {
    if (!filters.store_brand) {
      alert('Please select a store brand first');
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<{ data: Product[] }>(
        `/product-data/${filters.store_brand}`,
      );
      let filteredProducts = data.data || [];

      console.log(`Total products loaded: ${filteredProducts.length}`);

      // Apply filters
      if (filters.brand) {
        const beforeCount = filteredProducts.length;
        filteredProducts = filteredProducts.filter((p: Product) =>
          p.brand.toLowerCase().includes(filters.brand.toLowerCase()),
        );
        console.log(
          `After brand filter: ${filteredProducts.length} (was ${beforeCount})`,
        );
      }

      if (filters.name) {
        const beforeCount = filteredProducts.length;
        filteredProducts = filteredProducts.filter((p: Product) =>
          p.title.toLowerCase().includes(filters.name.toLowerCase()),
        );
        console.log(
          `After name filter: ${filteredProducts.length} (was ${beforeCount})`,
        );
      }

      if (filters.gtin) {
        const beforeCount = filteredProducts.length;
        console.log(`Searching for GTIN: "${filters.gtin}"`);

        // More robust GTIN search - check multiple formats
        filteredProducts = filteredProducts.filter((p: Product) => {
          const productGtin = p.gtin?.toString() || '';
          const searchGtin = filters.gtin.toString();

          // Check exact match, partial match, and without spaces/dashes
          return (
            productGtin.includes(searchGtin) ||
            productGtin
              .replace(/[\s-]/g, '')
              .includes(searchGtin.replace(/[\s-]/g, '')) ||
            searchGtin.includes(productGtin)
          );
        });

        console.log(
          `After GTIN filter: ${filteredProducts.length} (was ${beforeCount})`,
        );

        // Debug: show some GTIN examples
        if (filteredProducts.length === 0 && beforeCount > 0) {
          const allProducts = data.data || [];
          const gtinExamples = allProducts
            .slice(0, 10)
            .map((p: Product) => p.gtin)
            .filter(Boolean);
          console.log('Sample GTINs in database:', gtinExamples);
        }
      }

      const finalResults = filteredProducts.slice(0, filters.limit);
      console.log(`Final results: ${finalResults.length} products`);
      setProducts(finalResults);
    } catch (error) {
      console.error('Failed to search products:', error);
      alert('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
    setNewColorData(null);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedProduct(null);
    setNewColorData(null);
  };

  const openCreateDialog = () => {
    setNewProductData({
      gtin: filters.gtin,
      store_brand: filters.store_brand,
      brand: '',
      title: '',
      price: 0,
      type: 'Foundation',
      color_hex: '',
      color_lab: [],
    });
    setCreateDialogOpen(true);
    setNewColorData(null);
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewProductData({});
    setNewColorData(null);
  };

  const startColorScan = () => {
    scanColor();
  };

  const updateProductColor = async () => {
    if (!selectedProduct || !newColorData) return;

    setUpdateLoading(true);
    try {
      const productId =
        selectedProduct.product_id ||
        selectedProduct.gtin ||
        selectedProduct.dan ||
        selectedProduct.code ||
        `${selectedProduct.brand}_${selectedProduct.title}`.replace(
          /\s+/g,
          '_',
        );

      await api.put(`/firestore/products/${productId}`, {
        updates: {
          color_hex: newColorData.hex,
          color_lab: newColorData.lab,
        },
        updated_by: 'dev_scanner',
      });

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p === selectedProduct
            ? {
                ...p,
                color_hex: newColorData.hex,
                color_lab: newColorData.lab,
              }
            : p,
        ),
      );
      closeEditDialog();
      alert('Product color updated successfully!');
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product color');
    } finally {
      setUpdateLoading(false);
    }
  };

  const createProduct = async () => {
    if (
      !newProductData.gtin ||
      !newProductData.brand ||
      !newProductData.title
    ) {
      alert('Please fill in GTIN, Brand, and Title fields');
      return;
    }

    setCreateLoading(true);
    try {
      const productToCreate = {
        ...newProductData,
        ...(newColorData && {
          color_hex: newColorData.hex,
          color_lab: newColorData.lab,
        }),
      };

      await api.post('/firestore/products', {
        product_id: newProductData.gtin,
        product_data: productToCreate,
        created_by: 'dev_scanner',
      });

      // Add to local state
      setProducts((prev) => [productToCreate as Product, ...prev]);
      closeCreateDialog();
      alert('Product created successfully!');

      // Clear the search filters to show the new product
      setFilters({
        ...filters,
        brand: '',
        name: '',
        gtin: '',
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        📦 Product Scanner
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Search, filter, and modify product database. Use the color sensor to
        rescan product colors.
      </Typography>

      {/* Search Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Search Filters
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Store Brand</InputLabel>
              <Select
                value={filters.store_brand}
                label="Store Brand"
                onChange={(e) =>
                  setFilters({ ...filters, store_brand: e.target.value })
                }
              >
                {storeBrands.map((brand) => (
                  <MenuItem key={brand} value={brand}>
                    {brand}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Product Brand"
              value={filters.brand}
              onChange={(e) =>
                setFilters({ ...filters, brand: e.target.value })
              }
              placeholder="e.g., L'ORÉAL"
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Product Name"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              placeholder="e.g., Foundation"
            />
            <TextField
              fullWidth
              label="GTIN Number"
              value={filters.gtin}
              onChange={(e) => setFilters({ ...filters, gtin: e.target.value })}
              placeholder="e.g., 3600523351596"
            />
            <TextField
              type="number"
              label="Limit"
              value={filters.limit}
              onChange={(e) =>
                setFilters({ ...filters, limit: parseInt(e.target.value) })
              }
              sx={{ minWidth: 120 }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              onClick={searchProducts}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : '🔍'}
            >
              Search Products
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setFilters({
                  ...filters,
                  brand: '',
                  name: '',
                  gtin: '',
                  limit: 20,
                });
                setTimeout(searchProducts, 100);
              }}
              disabled={loading || !filters.store_brand}
              startIcon="📋"
            >
              Show All Products
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Results */}
      {products.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📊 Results ({products.length} products)
          </Typography>
          <Stack spacing={2}>
            {products.map((product, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {product.color_hex && (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: product.color_hex,
                          borderRadius: 1,
                          border: '1px solid #ccc',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h3">
                        {product.brand} - {product.title}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip
                          label={product.type}
                          size="small"
                          color="primary"
                        />
                        <Chip
                          label={`€${product.price}`}
                          size="small"
                          color="secondary"
                        />
                        {product.color_hex && (
                          <Chip
                            label={product.color_hex}
                            size="small"
                            sx={{ backgroundColor: product.color_hex }}
                          />
                        )}
                      </Stack>
                      {product.color_lab && (
                        <Typography variant="body2" color="text.secondary">
                          LAB: [{product.color_lab.join(', ')}]
                        </Typography>
                      )}
                      {product.gtin && (
                        <Typography variant="body2" color="text.secondary">
                          GTIN: {product.gtin}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => openEditDialog(product)}
                    startIcon="✏️"
                  >
                    Edit Color
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>
        </Paper>
      )}

      {/* No Results - Show Create Option */}
      {products.length === 0 && !loading && filters.gtin && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            🔍 No products found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            No products found with GTIN: {filters.gtin}
          </Typography>
          <Button
            variant="contained"
            onClick={openCreateDialog}
            startIcon="➕"
            color="success"
          >
            Create New Product
          </Button>
        </Paper>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={closeEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>✏️ Edit Product Color</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedProduct.brand} - {selectedProduct.title}
              </Typography>

              {/* Current Color */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Current Color:
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  {selectedProduct.color_hex && (
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        backgroundColor: selectedProduct.color_hex,
                        borderRadius: 1,
                        border: '1px solid #ccc',
                      }}
                    />
                  )}
                  <Box>
                    <Typography variant="body2">
                      Hex: {selectedProduct.color_hex || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      LAB:{' '}
                      {selectedProduct.color_lab
                        ? `[${selectedProduct.color_lab.join(', ')}]`
                        : 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Color Sensor */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  🎨 Color Sensor:
                </Typography>
                <Button
                  variant="contained"
                  onClick={startColorScan}
                  disabled={isScanning}
                  startIcon={isScanning ? <CircularProgress size={20} /> : '📷'}
                >
                  {isScanning ? 'Scanning...' : 'Scan Color'}
                </Button>

                {newColorData && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      New Color Detected:
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          backgroundColor: newColorData.hex,
                          borderRadius: 1,
                          border: '1px solid #ccc',
                        }}
                      />
                      <Box>
                        <Typography variant="body2">
                          Hex: {newColorData.hex}
                        </Typography>
                        <Typography variant="body2">
                          LAB: [{newColorData.lab.join(', ')}]
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button
            onClick={updateProductColor}
            disabled={!newColorData || updateLoading}
            variant="contained"
            startIcon={updateLoading ? <CircularProgress size={20} /> : '💾'}
          >
            {updateLoading ? 'Updating...' : 'Update Color'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={closeCreateDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>➕ Create New Product</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Stack spacing={3}>
              {/* Basic Product Information */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  📦 Basic Information
                </Typography>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="GTIN *"
                      value={newProductData.gtin || ''}
                      onChange={(e) =>
                        setNewProductData({
                          ...newProductData,
                          gtin: e.target.value,
                        })
                      }
                      required
                    />
                    <FormControl fullWidth>
                      <InputLabel>Store Brand *</InputLabel>
                      <Select
                        value={newProductData.store_brand || ''}
                        label="Store Brand *"
                        onChange={(e) =>
                          setNewProductData({
                            ...newProductData,
                            store_brand: e.target.value,
                          })
                        }
                      >
                        {storeBrands.map((brand) => (
                          <MenuItem key={brand} value={brand}>
                            {brand}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="Product Brand *"
                      value={newProductData.brand || ''}
                      onChange={(e) =>
                        setNewProductData({
                          ...newProductData,
                          brand: e.target.value,
                        })
                      }
                      required
                      placeholder="e.g., L'ORÉAL"
                    />
                    <TextField
                      fullWidth
                      label="Product Title *"
                      value={newProductData.title || ''}
                      onChange={(e) =>
                        setNewProductData({
                          ...newProductData,
                          title: e.target.value,
                        })
                      }
                      required
                      placeholder="e.g., True Match Foundation"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl fullWidth>
                      <InputLabel>Product Type</InputLabel>
                      <Select
                        value={newProductData.type || 'Foundation'}
                        label="Product Type"
                        onChange={(e) =>
                          setNewProductData({
                            ...newProductData,
                            type: e.target.value,
                          })
                        }
                      >
                        <MenuItem value="Foundation">Foundation</MenuItem>
                        <MenuItem value="Concealer">Concealer</MenuItem>
                        <MenuItem value="Powder">Powder</MenuItem>
                        <MenuItem value="Blush">Blush</MenuItem>
                        <MenuItem value="Bronzer">Bronzer</MenuItem>
                        <MenuItem value="Highlighter">Highlighter</MenuItem>
                        <MenuItem value="Lipstick">Lipstick</MenuItem>
                        <MenuItem value="Eyeshadow">Eyeshadow</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Price (€)"
                      type="number"
                      value={newProductData.price || 0}
                      onChange={(e) =>
                        setNewProductData({
                          ...newProductData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* Color Information */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  🎨 Color Information
                </Typography>
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    onClick={startColorScan}
                    disabled={isScanning}
                    startIcon={
                      isScanning ? <CircularProgress size={20} /> : '📷'
                    }
                  >
                    {isScanning ? 'Scanning...' : 'Scan Product Color'}
                  </Button>

                  {newColorData && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Detected Color:
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            backgroundColor: newColorData.hex,
                            borderRadius: 1,
                            border: '1px solid #ccc',
                          }}
                        />
                        <Box>
                          <Typography variant="body2">
                            Hex: {newColorData.hex}
                          </Typography>
                          <Typography variant="body2">
                            LAB: [{newColorData.lab.join(', ')}]
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Optional Fields */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  📋 Optional Information
                </Typography>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="DAN Code"
                      value={newProductData.dan || ''}
                      onChange={(e) =>
                        setNewProductData({
                          ...newProductData,
                          dan: e.target.value,
                        })
                      }
                    />
                    <TextField
                      fullWidth
                      label="Product Code"
                      value={newProductData.code || ''}
                      onChange={(e) =>
                        setNewProductData({
                          ...newProductData,
                          code: e.target.value,
                        })
                      }
                    />
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateDialog}>Cancel</Button>
          <Button
            onClick={createProduct}
            disabled={createLoading}
            variant="contained"
            color="success"
            startIcon={createLoading ? <CircularProgress size={20} /> : '➕'}
          >
            {createLoading ? 'Creating...' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function ProductScannerPage() {
  return (
    <ColorSensorProvider>
      <ProductScanner />
    </ColorSensorProvider>
  );
}
