import {
  ArrowBack as ArrowBackIcon,
  ShoppingCart as ShoppingCartIcon,
  Palette as PaletteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Button,
  Divider,
  LinearProgress,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router';

import { ColorPointsDisplay } from '~/features/dev/components/data-points-display';
import type { colorPointType } from '~/features/dev/types/color-points';
import { useAuth } from '~/firebase/auth-provider';
import { api } from '~/utils/api-client';

export function meta() {
  return [
    { title: 'Client Detail - Developer Tools' },
    {
      name: 'description',
      content: 'Detailed view of client data and recommendations',
    },
  ];
}

interface ClientRecommendation {
  product_brand_name: string;
  product_description: string;
  product_color_swatch: string;
  product_image: string;
  product_link: string;
  price: string;
  type: string;
  match_percentage: string;
  color_distance: number;
  erp_connection: boolean;
  instore_status: boolean;
  online_status: boolean;
  stock_level: number;
  product_id: string;
  color_lab: number[];
  color_hex: string;
  rescanned: boolean;
}

interface ClientDetail {
  client_id: string;
  features: {
    color_avg_hex: string;
    color_avg_lab: {
      L: number;
      a: number;
      b: number;
    };
    colors_hex: {
      [key: string]: string;
    };
    colors_lab: {
      [key: string]: {
        L: number;
        a: number;
        b: number;
      };
    };
  };
  user_flow: {
    result_page_timestamp: string;
    browser_name: string;
    retailer: string;
    store_location: string;
    exit_timestamp?: string;
    phone_page_results_timestamp?: string;
    clarity_id?: string;
    [key: string]: any;
  };
  recommendations: ClientRecommendation[];
  recommendation_focus: {
    filters: {
      category: string[];
      coverage: string[];
      others: string[];
    };
    final_recommendations: any[];
  };
  feedback?: {
    rating: number;
    feedback_timestamp: string;
    opinions: string;
    improvements: string[];
  };
}

async function fetchClientDetail(
  clientId: string,
  token?: string,
): Promise<ClientDetail> {
  return api.get<ClientDetail>(`/get_client_with_product_details/${clientId}`, {
    token,
  });
}

function transformClientDetailToColorPoints(
  client: ClientDetail,
): colorPointType[] {
  const colorPoints: colorPointType[] = [];
  for (const [key, lab] of Object.entries(client.features.colors_lab)) {
    const hex = client.features.colors_hex[key];
    if (hex && lab) {
      colorPoints.push({
        description: `Client Color ${key}`,
        color: hex,
        position: {
          L: lab.L,
          a: lab.a,
          b: lab.b,
        },
      });
    }
  }

  return colorPoints;
}

function transformRecommendationsToColorPoints(
  recommendations: any[],
): colorPointType[] {
  return recommendations.map((item) => ({
    description: `${item.product_brand_name} ${item.product_description} (${extractGTIN(item.product_link)})`,
    color: item.product_color_swatch,
    position: {
      L: item.color_lab[0],
      a: item.color_lab[1],
      b: item.color_lab[2],
    },
  }));
}

function useClientDetail(clientId: string, token?: string) {
  return useQuery({
    queryKey: ['client-detail', clientId],
    queryFn: () => fetchClientDetail(clientId, token),
    enabled: !!clientId && !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Color swatch component for displaying colors
function ColorSwatch({
  color,
  size = 40,
  label,
}: {
  color: string;
  size?: number;
  label?: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: size,
          height: size,
          backgroundColor: color,
          border: '1px solid #ccc',
          borderRadius: 1,
          boxShadow: 1,
        }}
      />
      {label && (
        <Typography variant="caption" fontFamily="monospace">
          {label}
        </Typography>
      )}
    </Box>
  );
}

// Function to extract GTIN from product link
function extractGTIN(productLink: string): string {
  const match = productLink.match(/p(\d+)\.html$/);
  return match ? match[1] : 'N/A';
}

// Product recommendations table component
function RecommendationTable({
  recommendations,
  clientColor,
}: {
  recommendations: ClientRecommendation[];
  clientColor: string;
}) {
  console.log('Client Color:', recommendations);
  return (
    <TableContainer sx={{ maxHeight: 800 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Order</TableCell>
            <TableCell sx={{ minWidth: 240 }}>Product</TableCell>
            <TableCell>Brand</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>GTIN</TableCell>
            <TableCell>Match %</TableCell>
            <TableCell>Color Distance</TableCell>
            <TableCell>CIE Lab</TableCell>
            <TableCell>Rescanned</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Stock</TableCell>
            <TableCell>Color Comparison</TableCell>
            <TableCell>DM Link</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {recommendations.map((product, index) => (
            <TableRow
              key={index}
              sx={{
                backgroundColor:
                  parseFloat(product.match_percentage.replace('%', '')) >= 90
                    ? 'success.light'
                    : parseFloat(product.match_percentage.replace('%', '')) >=
                        80
                      ? 'warning.light'
                      : 'inherit',
              }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {index + 1}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {product.product_description}
                </Typography>
              </TableCell>
              <TableCell>{product.product_brand_name}</TableCell>
              <TableCell>
                <Chip label={product.type} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {extractGTIN(product.product_link)}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {product.match_percentage}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(
                      product.match_percentage.replace('%', ''),
                    )}
                    sx={{ width: 60, height: 6, borderRadius: 3 }}
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {product.color_distance !== undefined
                    ? product.color_distance.toFixed(5)
                    : 'N/A'}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {product.color_lab && product.color_lab.length === 3 ? (
                    <>
                      <Chip
                        label={`L:${product.color_lab[0].toFixed(1)}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                      />
                      <Chip
                        label={`a:${product.color_lab[1].toFixed(1)}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                      />
                      <Chip
                        label={`b:${product.color_lab[2].toFixed(1)}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                      />
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      N/A
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={product.rescanned ? 'Yes' : 'No'}
                  size="small"
                  color={product.rescanned ? 'success' : 'error'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>{product.price}</TableCell>
              <TableCell>
                <Chip
                  label={
                    product.stock_level > 0
                      ? `${product.stock_level} in stock`
                      : 'Out of stock'
                  }
                  size="small"
                  color={product.stock_level > 0 ? 'success' : 'error'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ColorSwatch color={clientColor} size={20} />
                  <Typography variant="caption">→</Typography>
                  <ColorSwatch color={product.product_color_swatch} size={20} />
                </Box>
              </TableCell>
              <TableCell>
                <Button
                  component="a"
                  href={product.product_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Visit DM
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const { token } = useAuth();
  const {
    data: client,
    isLoading,
    error,
  } = useClientDetail(clientId || '', token);

  if (!clientId) {
    return <Alert severity="error">Invalid client ID provided</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <LinearProgress sx={{ width: '100%' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load client data: {error.message}
      </Alert>
    );
  }

  if (!client) {
    return <Alert severity="warning">No client data found</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button
        component={Link}
        to="/dev/clients-db"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
      >
        Back to Clients Database
      </Button>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Client Overview */}
        <Paper sx={{ p: 3 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <PaletteIcon />
            Client {client.client_id}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">Detected Skin Color:</Typography>
            {client.features?.color_avg_hex ? (
              <ColorSwatch
                color={client.features.color_avg_hex}
                size={40}
                label={client.features.color_avg_hex}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No color data available
              </Typography>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary">
            Analysis performed on:{' '}
            {new Date(client.user_flow.result_page_timestamp).toLocaleString()}
          </Typography>
        </Paper>

        {/* Detailed Features Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Color Analysis Features
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Average Color Lab Values */}
          {client.features?.color_avg_lab && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Average Color (CIE Lab):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={`L: ${client.features.color_avg_lab.L.toFixed(1)}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
                <Chip
                  label={`a: ${client.features.color_avg_lab.a.toFixed(1)}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
                <Chip
                  label={`b: ${client.features.color_avg_lab.b.toFixed(1)}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>
            </Box>
          )}

          {/* Individual Color Samples */}
          {client.features?.colors_hex && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Detected Color Samples:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {Object.entries(client.features.colors_hex).map(
                  ([key, hex]) => (
                    <Box
                      key={key}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Sample {key}
                      </Typography>
                      <ColorSwatch color={hex} size={30} label={hex} />
                      {client.features?.colors_lab?.[key] && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Chip
                            label={`L:${client.features.colors_lab[key].L.toFixed(1)}`}
                            size="small"
                            variant="filled"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                            }}
                          />
                          <Chip
                            label={`a:${client.features.colors_lab[key].a.toFixed(1)}`}
                            size="small"
                            variant="filled"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                            }}
                          />
                          <Chip
                            label={`b:${client.features.colors_lab[key].b.toFixed(1)}`}
                            size="small"
                            variant="filled"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  ),
                )}
              </Box>
            </Box>
          )}
        </Paper>

        {/* User Flow Information */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Session Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Browser
              </Typography>
              <Typography variant="body2">
                {client.user_flow?.browser_name || 'N/A'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Retailer
              </Typography>
              <Typography variant="body2">
                {client.user_flow?.retailer || 'N/A'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Store Location
              </Typography>
              <Typography variant="body2">
                {client.user_flow?.store_location || 'N/A'}
              </Typography>
            </Box>

            {client.user_flow?.clarity_id && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Clarity ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {client.user_flow.clarity_id}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Timestamps */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Session Timeline
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {client.user_flow?.result_page_timestamp && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ minWidth: 150 }}
                  >
                    Result Page:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {new Date(
                      client.user_flow.result_page_timestamp,
                    ).toLocaleString()}
                  </Typography>
                </Box>
              )}
              {client.user_flow?.phone_page_results_timestamp && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ minWidth: 150 }}
                  >
                    Phone Results:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {new Date(
                      client.user_flow.phone_page_results_timestamp,
                    ).toLocaleString()}
                  </Typography>
                </Box>
              )}
              {client.user_flow?.exit_timestamp && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ minWidth: 150 }}
                  >
                    Exit Time:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {new Date(client.user_flow.exit_timestamp).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>

        {/* User Feedback Section */}
        {client.feedback && (
          <Paper sx={{ p: 3 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <FeedbackIcon />
              User Feedback
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Rating */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Rating
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Box key={star}>
                      {star <= (client.feedback?.rating || 0) ? (
                        <StarIcon color="warning" />
                      ) : (
                        <StarBorderIcon color="action" />
                      )}
                    </Box>
                  ))}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {client.feedback?.rating || 0}/5
                  </Typography>
                </Box>
              </Box>

              {/* Feedback Timestamp */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Submitted On
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {client.feedback?.feedback_timestamp
                    ? new Date(
                        client.feedback.feedback_timestamp,
                      ).toLocaleString()
                    : 'N/A'}
                </Typography>
              </Box>

              {/* Opinions */}
              {client.feedback?.opinions && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    User Comments
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.50',
                      borderLeft: 3,
                      borderLeftColor: 'primary.main',
                    }}
                  >
                    <Typography variant="body2">
                      &ldquo;{client.feedback.opinions}&rdquo;
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Improvements */}
              {client.feedback?.improvements &&
                client.feedback.improvements.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Suggested Improvements
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      {client.feedback.improvements.map(
                        (improvement, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1,
                              backgroundColor: 'info.light',
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="body2" fontWeight="medium">
                              •
                            </Typography>
                            <Typography variant="body2">
                              {improvement}
                            </Typography>
                          </Box>
                        ),
                      )}
                    </Box>
                  </Box>
                )}
            </Box>
          </Paper>
        )}

        {/* Recommendation Focus */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recommendation Configuration
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Applied Filters */}
            {client.recommendation_focus?.filters && (
              <>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Product Categories
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {client.recommendation_focus.filters.category?.length >
                    0 ? (
                      client.recommendation_focus.filters.category.map(
                        (category, index) => (
                          <Chip
                            key={index}
                            label={category}
                            variant="outlined"
                            color="primary"
                          />
                        ),
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No category filters applied
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Coverage Preferences
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {client.recommendation_focus.filters.coverage?.length >
                    0 ? (
                      client.recommendation_focus.filters.coverage.map(
                        (coverage, index) => (
                          <Chip
                            key={index}
                            label={coverage}
                            variant="outlined"
                            color="secondary"
                          />
                        ),
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No coverage preferences specified
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Other Filters
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {client.recommendation_focus.filters.others?.length > 0 ? (
                      client.recommendation_focus.filters.others.map(
                        (other, index) => (
                          <Chip
                            key={index}
                            label={other}
                            variant="filled"
                            size="small"
                          />
                        ),
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No additional filters applied
                      </Typography>
                    )}
                  </Box>
                </Box>
              </>
            )}

            {/* Final Recommendations Summary */}
            {client.recommendation_focus?.final_recommendations && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Quick Recommendations (
                  {client.recommendation_focus.final_recommendations.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {client.recommendation_focus.final_recommendations
                    .slice(0, 5)
                    .map((rec, index) => (
                      <Box
                        key={index}
                        sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {rec.brand} - {rec.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rec.type} • {rec.price} • {rec.availability}
                        </Typography>
                      </Box>
                    ))}
                  {client.recommendation_focus.final_recommendations.length >
                    5 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      +
                      {client.recommendation_focus.final_recommendations
                        .length - 5}{' '}
                      more recommendations
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Product Types - Keep existing section but move it down */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recommended Product Types
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {client.recommendation_focus?.filters?.category?.map(
              (type: string, index: number) => (
                <Chip key={index} label={type} variant="outlined" />
              ),
            ) || (
              <Typography variant="body2" color="text.secondary">
                No categories available
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Product Recommendations Section */}
        <Paper sx={{ p: 3 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <ShoppingCartIcon />
            Product Recommendations ({client.recommendations.length})
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <RecommendationTable
            recommendations={client.recommendations}
            clientColor={client.features?.color_avg_hex || '#000000'}
          />
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Color Points Visualization
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <ColorPointsDisplay
            points={[
              ...transformClientDetailToColorPoints(client),
              ...transformRecommendationsToColorPoints(client.recommendations),
            ]}
          />
        </Paper>
        {/* Raw Endpoint Data Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Raw Endpoint Response
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box
            component="textarea"
            sx={{
              width: '100%',
              minHeight: 300,
              maxHeight: 800,
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              border: '1px solid #ccc',
              borderRadius: 1,
              p: 2,
              backgroundColor: '#f5f5f5',
              overflow: 'auto',
            }}
            value={JSON.stringify(client, null, 2)}
            readOnly
          />
        </Paper>
      </Box>
    </Box>
  );
}
