import {
  Typography,
  Box,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Stack,
  Card,
  CardContent,
  LinearProgress,
  Chip,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { useApi } from '~/hooks/use-api';

export function meta() {
  return [
    { title: 'System Status - Makeup Match' },
    { name: 'description', content: 'System status and health monitoring' },
  ];
}

interface SystemStatus {
  firestore_available: boolean;
  foundation_matching_service: string;
  cache_info: {
    cache_entries: number;
    cache_keys: string[];
    cache_ttl_seconds: number;
  };
  supported_stores: string[];
  firestore_connection?: string;
  firestore_brands?: string[];
  firestore_error?: string;
}

interface CacheStats {
  cache_entries: number;
  cache_keys: string[];
  cache_ttl_seconds: number;
  cache_hit_rate?: number;
  cache_size_mb?: number;
}

export default function SystemStatus() {
  const api = useApi();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    fetchSystemStatus();
    fetchCacheStats();
    const interval = setInterval(() => {
      fetchSystemStatus();
      fetchCacheStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const data = await api.get<SystemStatus>('/system/status');
      setSystemStatus(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCacheStats = async () => {
    try {
      const data = await api.get<CacheStats>('/system/cache');
      setCacheStats(data);
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    }
  };

  const clearCache = async () => {
    try {
      await api.post('/system/cache/clear');
      await fetchCacheStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const refreshStatus = () => {
    setLoading(true);
    fetchSystemStatus();
    fetchCacheStats();
  };

  if (loading && !systemStatus) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          ⚙️ System Status
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">⚙️ System Status</Typography>
        <Button variant="outlined" onClick={refreshStatus} disabled={loading}>
          🔄 Refresh
        </Button>
      </Stack>

      {lastRefresh && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </Typography>
      )}

      <Stack spacing={3}>
        {/* Overall Status */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🏥 Health Overview
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Alert
              severity={
                systemStatus?.firestore_available ? 'success' : 'warning'
              }
              sx={{ flex: 1 }}
            >
              <strong>Firestore:</strong>{' '}
              {systemStatus?.firestore_available ? 'Connected' : 'Disconnected'}
            </Alert>
            <Alert severity="info" sx={{ flex: 1 }}>
              <strong>Foundation Service:</strong>{' '}
              {systemStatus?.foundation_matching_service || 'Unknown'}
            </Alert>
          </Stack>
        </Paper>

        {/* Firestore Status */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🔥 Firestore Details
          </Typography>
          {systemStatus?.firestore_available ? (
            <Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>✅</ListItemIcon>
                  <ListItemText
                    primary="Connection Status"
                    secondary={systemStatus.firestore_connection || 'Connected'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>🏪</ListItemIcon>
                  <ListItemText
                    primary="Available Brands"
                    secondary={
                      systemStatus.firestore_brands?.length
                        ? `${systemStatus.firestore_brands.length} brands`
                        : 'Loading...'
                    }
                  />
                </ListItem>
              </List>
              {systemStatus.firestore_brands && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Brands:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {systemStatus.firestore_brands.map((brand) => (
                      <Chip key={brand} label={brand} size="small" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="error">
              {systemStatus?.firestore_error || 'Firestore not available'}
            </Alert>
          )}
        </Paper>

        {/* Cache Statistics */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            💾 Cache Statistics
          </Typography>
          {cacheStats ? (
            <Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>📊</ListItemIcon>
                  <ListItemText
                    primary="Active Entries"
                    secondary={cacheStats.cache_entries}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>⏱️</ListItemIcon>
                  <ListItemText
                    primary="TTL (Time to Live)"
                    secondary={`${cacheStats.cache_ttl_seconds} seconds`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>🔑</ListItemIcon>
                  <ListItemText
                    primary="Cache Keys"
                    secondary={cacheStats.cache_keys.length}
                  />
                </ListItem>
                {cacheStats.cache_hit_rate && (
                  <ListItem>
                    <ListItemIcon>🎯</ListItemIcon>
                    <ListItemText
                      primary="Hit Rate"
                      secondary={`${(cacheStats.cache_hit_rate * 100).toFixed(1)}%`}
                    />
                  </ListItem>
                )}
                {cacheStats.cache_size_mb && (
                  <ListItem>
                    <ListItemIcon>💽</ListItemIcon>
                    <ListItemText
                      primary="Cache Size"
                      secondary={`${cacheStats.cache_size_mb.toFixed(2)} MB`}
                    />
                  </ListItem>
                )}
              </List>
              <Button
                variant="outlined"
                color="warning"
                onClick={clearCache}
                sx={{ mt: 2 }}
              >
                🗑️ Clear Cache
              </Button>
            </Box>
          ) : (
            <Alert severity="info">Loading cache statistics...</Alert>
          )}
        </Paper>

        {/* Store Brands */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🏪 Supported Stores
          </Typography>
          {systemStatus?.supported_stores ? (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {systemStatus.supported_stores.length} stores supported
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {systemStatus.supported_stores.map((store) => (
                  <Chip
                    key={store}
                    label={store}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Stack>
            </Box>
          ) : (
            <Alert severity="info">No store information available</Alert>
          )}
        </Paper>

        {/* API Endpoints */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🔗 API Endpoints
          </Typography>
          <Stack spacing={1}>
            <Card variant="outlined">
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Backend URL: {import.meta.env.VITE_BACKEND_CLOUD_URL}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Local URL: {import.meta.env.VITE_BACKEND_LOCAL_URL}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
