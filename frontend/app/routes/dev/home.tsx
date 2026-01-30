import {
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';

import { useApi } from '~/hooks/use-api';

export function meta() {
  return [
    { title: 'Developer Home - Makeup Match' },
    { name: 'description', content: 'Developer tools homepage' },
  ];
}

interface CacheInfo {
  cache_entries: number;
  cache_keys: string[];
  cache_ttl_seconds: number;
}

export default function DevHome() {
  const api = useApi();
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [cacheLoading, setCacheLoading] = useState(true);

  useEffect(() => {
    if (api.isAuthenticated) {
      fetchCacheInfo();
    }
  }, [api.isAuthenticated]);

  const fetchCacheInfo = async () => {
    try {
      const data = await api.get<CacheInfo>('/system/cache');
      setCacheInfo(data);
    } catch (error) {
      console.error('Failed to fetch cache info:', error);
    } finally {
      setCacheLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      await api.post('/system/cache/clear');
      fetchCacheInfo(); // Refresh cache info
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🏠 Developer Home
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome to the MakeupMatch developer tools. Here you can manage
        products, monitor system status, and access various development
        utilities.
      </Typography>

      <Stack spacing={3}>
        {/* Tools Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🛠️ Available Tools
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" component="h2">
                  📦 Product Scanner
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse, search, and modify product database. Use color sensor
                  to rescan product colors.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  component={Link}
                  to="/dev/product-scanner"
                  variant="contained"
                >
                  Open Scanner
                </Button>
              </CardActions>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" component="h2">
                  ⚙️ System Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monitor system health, Firestore connection, and performance
                  metrics.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  component={Link}
                  to="/dev/system-status"
                  variant="contained"
                >
                  View Status
                </Button>
              </CardActions>
            </Card>
          </Stack>
        </Paper>

        {/* Cache Info Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            💾 Cache Information
          </Typography>
          {cacheLoading ? (
            <Typography>Loading cache info...</Typography>
          ) : cacheInfo ? (
            <Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>📊</ListItemIcon>
                  <ListItemText
                    primary="Cache Entries"
                    secondary={cacheInfo.cache_entries}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>⏱️</ListItemIcon>
                  <ListItemText
                    primary="TTL"
                    secondary={`${cacheInfo.cache_ttl_seconds}s`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>🔑</ListItemIcon>
                  <ListItemText
                    primary="Active Keys"
                    secondary={cacheInfo.cache_keys.length}
                  />
                </ListItem>
              </List>
              <Button
                variant="outlined"
                color="warning"
                onClick={clearCache}
                sx={{ mt: 2 }}
              >
                Clear Cache
              </Button>
            </Box>
          ) : (
            <Alert severity="warning">Failed to load cache information</Alert>
          )}
        </Paper>

        {/* Quick Links */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🔗 Quick Links
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              fullWidth
              href={`${import.meta.env.VITE_BACKEND_CLOUD_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
            >
              📚 API Docs
            </Button>
            <Button
              variant="outlined"
              fullWidth
              component={Link}
              to="/research"
            >
              🔬 Research Page
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
