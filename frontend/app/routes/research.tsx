import {
  Typography,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { Loading } from '~/components/ui/loading';
import { ColorSensorProvider, useScanColor } from '~/context/color-sensor';
import { useAuth } from '~/firebase/auth-provider';
import { api } from '~/utils/api-client';

export function meta() {
  return [
    { title: 'Research - Makeup Match' },
    { name: 'description', content: 'Internal R&D Research Page' },
  ];
}

interface ResearchResponse {
  user_id: string;
  timestamp: string;
  client: {
    color: string;
  };
  products: Array<{
    product_brand_name: string;
    product_description: string;
    product_color_swatch: string;
    product_image: string;
    product_link: string;
    price: string;
    type: string;
    match_percentage: string;
    erp_connection: boolean;
    instore_status: boolean;
    online_status: boolean;
    stock_level: number;
  }>;
}

async function postResearchResults(
  l: number,
  a: number,
  b: number,
  token?: string,
): Promise<ResearchResponse> {
  const payload = {
    config: {
      store_name: 'dm',
      store_location: 'D522',
      language: 'de',
    },
    answers: [
      {
        type: 'camera',
        features: null,
      },
      {
        type: 'scan',
        scanResult: [[l, a, b]],
      },
    ],
  };

  return api.post<ResearchResponse>('/get_results', payload, { token });
}
export default function ResearchPage() {
  return (
    <ColorSensorProvider>
      <ResearchPageInner />
    </ColorSensorProvider>
  );
}
function ResearchPageInner() {
  const [lValue, setLValue] = useState<string>('58.43');
  const [aValue, setAValue] = useState<string>('12.01');
  const [bValue, setBValue] = useState<string>('15.92');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { trigger, data, isPending } = useScanColor();
  const { token } = useAuth();

  // Update L, a, b fields after a successful scan
  useEffect(() => {
    if (data && data.values) {
      setLValue(data.values[0].toFixed(2));
      setAValue(data.values[1].toFixed(2));
      setBValue(data.values[2].toFixed(2));
    }
  }, [data]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const l = parseFloat(lValue);
      const a = parseFloat(aValue);
      const b = parseFloat(bValue);

      if (isNaN(l) || isNaN(a) || isNaN(b)) {
        throw new Error('Please enter valid numeric values for L, a, and b');
      }

      const response = await postResearchResults(l, a, b, token);
      setResults(response);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-4 bg-gray-50">
      {/* Header */}
      <div className="w-full max-w-4xl mb-6">
        <Typography
          variant="h4"
          fontWeight={600}
          color="text.primary"
          align="center"
          className="mb-2"
        >
          R&D Research Tool
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          Internal tool for testing color matching with CIE LAB values
        </Typography>
      </div>

      {/* Input Form */}
      <Card className="w-full max-w-md mb-6">
        <CardContent className="p-6">
          <Typography variant="h6" fontWeight={500} className="mb-4">
            CIE LAB Color Input
          </Typography>

          <Box className="flex flex-col gap-4">
            <TextField
              label="L* (Lightness)"
              value={lValue}
              onChange={(e) => setLValue(e.target.value)}
              type="number"
              inputProps={{ step: '0.01' }}
              variant="outlined"
              fullWidth
              placeholder="0-100"
            />

            <TextField
              label="a* (Green-Red)"
              value={aValue}
              onChange={(e) => setAValue(e.target.value)}
              type="number"
              inputProps={{ step: '0.01' }}
              variant="outlined"
              fullWidth
              placeholder="-128 to 127"
            />

            <TextField
              label="b* (Blue-Yellow)"
              value={bValue}
              onChange={(e) => setBValue(e.target.value)}
              type="number"
              inputProps={{ step: '0.01' }}
              variant="outlined"
              fullWidth
              placeholder="-128 to 127"
            />

            <Button
              variant="outlined"
              onClick={trigger}
              disabled={isPending}
              className="mt-2"
              size="large"
            >
              {isPending ? 'Scanning...' : 'Scan Color with Sensor'}
            </Button>

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4"
              size="large"
            >
              {loading ? 'Processing...' : 'Get Results'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="mb-6">
          <Loading size="medium" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="w-full max-w-4xl mb-6 border-red-200">
          <CardContent className="p-4">
            <Typography variant="body1" color="error" fontWeight={500}>
              Error: {error}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && (
        <div className="w-full max-w-4xl space-y-6">
          {/* Client Info */}
          <Card>
            <CardContent className="p-4">
              <Typography variant="h6" fontWeight={500} className="mb-2">
                Client Information
              </Typography>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded border-2 border-gray-300"
                  style={{ backgroundColor: results.client.color }}
                />
                <div>
                  <Typography variant="body1">
                    <strong>Color:</strong> {results.client.color}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    User ID: {results.user_id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Timestamp: {new Date(results.timestamp).toLocaleString()}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardContent className="p-4">
              <Typography variant="h6" fontWeight={500} className="mb-4">
                Recommended Products ({results.products.length})
              </Typography>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.products.slice(0, 12).map((product, index) => (
                  <Card key={index} variant="outlined" className="h-full">
                    <CardContent className="p-3">
                      {product.product_image && (
                        <img
                          src={product.product_image}
                          alt={product.product_description}
                          className="w-full h-32 object-cover rounded mb-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              'none';
                          }}
                        />
                      )}

                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        className="mb-1"
                      >
                        {product.product_brand_name}
                      </Typography>

                      <Typography
                        variant="body2"
                        className="mb-2 text-gray-700"
                      >
                        {product.product_description}
                      </Typography>

                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{
                            backgroundColor: product.product_color_swatch,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {product.product_color_swatch}
                        </Typography>
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <Typography variant="body2" fontWeight={500}>
                          {product.price}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="primary"
                          fontWeight={500}
                        >
                          {product.match_percentage}
                        </Typography>
                      </div>

                      <div className="flex gap-1 mb-2">
                        <span
                          className={`w-2 h-2 rounded-full ${product.instore_status ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span
                          className={`w-2 h-2 rounded-full ${product.online_status ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Stock: {product.stock_level}
                        </Typography>
                      </div>

                      {product.product_link && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            window.open(product.product_link, '_blank')
                          }
                          className="w-full"
                        >
                          View Product
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Raw JSON Display */}
          <Card>
            <CardContent className="p-4">
              <Typography variant="h6" fontWeight={500} className="mb-2">
                Raw API Response
              </Typography>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
