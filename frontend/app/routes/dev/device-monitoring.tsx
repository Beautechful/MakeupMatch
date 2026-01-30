import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OfflineBoltIcon from '@mui/icons-material/OfflineBolt';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Typography,
  Box,
  Paper,
  Alert,
  Stack,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { useApi } from '~/hooks/use-api';

export function meta() {
  return [
    { title: 'Device Monitoring - Makeup Match' },
    {
      name: 'description',
      content: 'Monitor connected devices and their status',
    },
  ];
}

interface DeviceData {
  status: string;
  user_id: string;
  email: string;
  custom_claims: Record<string, any>;
}

interface DeviceInfo {
  is_online: boolean;
  last_heartbeat: string;
  device_data: DeviceData;
}

interface DeviceStatusResponse {
  [device_id: string]: DeviceInfo;
}

export default function DeviceMonitoring() {
  const api = useApi();
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    fetchDeviceStatus();
    const interval = setInterval(() => {
      fetchDeviceStatus();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.isAuthenticated]);

  const fetchDeviceStatus = async () => {
    if (!api.isAuthenticated) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await api.get<DeviceStatusResponse>('/devices/status');
      setDeviceStatus(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch device status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (isOnline: boolean) => {
    if (isOnline) {
      return <CheckCircleIcon color="success" />;
    }
    return <OfflineBoltIcon color="disabled" />;
  };

  const getStatusChip = (isOnline: boolean) => {
    if (isOnline) {
      return <Chip label="Online" color="success" size="small" />;
    }
    return <Chip label="Offline" color="default" size="small" />;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const timediffHours = 1; // Adjust if needed for timezone
    const date = new Date(
      new Date(timestamp).getTime() + timediffHours * 60 * 60 * 1000,
    );
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleString();
  };

  const devices = deviceStatus ? Object.entries(deviceStatus) : [];
  const onlineCount = devices.filter(([, info]) => info.is_online).length;
  const offlineCount = devices.filter(([, info]) => !info.is_online).length;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h4" gutterBottom>
          📱 Device Monitoring
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={() => fetchDeviceStatus()} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body1" color="text.secondary" paragraph>
        Monitor all connected devices and their status in real-time.
      </Typography>

      {lastRefresh && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2, display: 'block' }}
        >
          Last updated: {lastRefresh.toLocaleTimeString()}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !deviceStatus ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {/* Summary Cards */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h4" color="text.secondary">
                  {devices.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Devices
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {onlineCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Online
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h4" color="text.disabled">
                  {offlineCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Offline
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {/* Devices Table */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              📋 Device List
            </Typography>
            {devices.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Device ID</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Device Status</TableCell>
                      <TableCell>Last Heartbeat</TableCell>
                      <TableCell>Custom Claims</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {devices.map(([deviceId, info]) => (
                      <TableRow key={deviceId}>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            {getStatusIcon(info.is_online)}
                            {getStatusChip(info.is_online)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {deviceId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {info.device_data?.email || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={info.device_data?.status || 'Unknown'}
                            size="small"
                            color={
                              info.device_data?.status === 'running'
                                ? 'success'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {formatTimestamp(info.last_heartbeat)}
                        </TableCell>
                        <TableCell>
                          {info.device_data?.custom_claims &&
                          Object.keys(info.device_data.custom_claims).length >
                            0 ? (
                            <Tooltip
                              title={JSON.stringify(
                                info.device_data.custom_claims,
                                null,
                                2,
                              )}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 150,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                }}
                              >
                                {Object.keys(
                                  info.device_data.custom_claims,
                                ).join(', ')}
                              </Typography>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No devices registered yet</Alert>
            )}
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
