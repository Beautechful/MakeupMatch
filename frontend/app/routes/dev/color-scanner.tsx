import {
  Camera as CameraIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ScatterPlot as ScatterPlotIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import {
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  Chip,
  IconButton,
  TextField,
} from '@mui/material';
import { useState, useRef, useCallback, useEffect } from 'react';

import { ColorSensorProvider, useColorSensor } from '~/context/color-sensor';
import { useClientsDb } from '~/features/clients-db/hooks/use-clients-db';
import { ColorPointsDisplay } from '~/features/dev/components/data-points-display';
import type { colorPointsType } from '~/features/dev/types/color-points';

export function meta() {
  return [
    { title: 'Color Scanner - Developer Tools' },
    {
      name: 'description',
      content: 'Multi-point color scanning with 3D CIE Lab visualization',
    },
  ];
}

interface ColorScan {
  id: string;
  timestamp: Date;
  cieL: number;
  cieA: number;
  cieB: number;
  hex: string;
  notes?: string;
}

// Convert ColorScan data to colorPointsType format for ColorPointsDisplay
function convertScansToColorPoints(scans: ColorScan[]): colorPointsType {
  return {
    points: scans.map((scan) => ({
      position: {
        L: scan.cieL,
        a: scan.cieA,
        b: scan.cieB,
      },
      color: scan.hex,
      description: scan.notes || `Scan ${scan.timestamp.toLocaleTimeString()}`,
    })),
  };
}

function ColorScannerContent() {
  const {
    scanColor,
    connectSensor,
    isConnected,
    isScanning,
    error: sensorError,
    needsManualConnect,
  } = useColorSensor();
  const [scans, setScans] = useState<ColorScan[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | undefined>();
  const [newNote, setNewNote] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const nextIdRef = useRef(1);

  // Client data hooks
  const {
    data: clientsData,
    isLoading: isLoadingClients,
    error: clientsError,
  } = useClientsDb();

  const handleScan = useCallback(async () => {
    setScanError(null);
    try {
      const colorData = await scanColor();
      if (colorData) {
        const [l, a, b] = colorData.values;

        const newScan: ColorScan = {
          id: `scan_${nextIdRef.current++}`,
          timestamp: new Date(),
          cieL: l,
          cieA: a,
          cieB: b,
          hex: colorData.hex_value,
          notes: newNote || undefined,
        };

        setScans((prev) => [...prev, newScan]);
        setNewNote('');
      }
    } catch (error) {
      console.error('Error during color scan:', error);
      setScanError(error instanceof Error ? error.message : 'Scan failed');
    }
  }, [scanColor, newNote, setScanError]);

  const handleDeleteScan = useCallback(
    (scanId: string) => {
      setScans((prev) => prev.filter((scan) => scan.id !== scanId));
      if (selectedScanId === scanId) {
        setSelectedScanId(undefined);
      }
    },
    [selectedScanId],
  );

  const handleClearAll = useCallback(() => {
    setScans([]);
    setSelectedScanId(undefined);
  }, []);

  const handleLoadClientData = useCallback(() => {
    if (!clientsData || clientsData.length === 0) {
      setScanError('No client data available to load');
      return;
    }

    const clientScans: ColorScan[] = clientsData.map((client) => ({
      id: `client_${client.client_id}`,
      timestamp: new Date(),
      cieL: client['features.color_avg_lab.L'],
      cieA: client['features.color_avg_lab.a'],
      cieB: client['features.color_avg_lab.b'],
      hex: client['features.color_avg_hex'],
      notes: `Client ${client.client_id} - Average Color`,
    }));

    setScans((prev) => [...prev, ...clientScans]);
    setScanError(null);
  }, [clientsData]);

  // Auto-load client data when component mounts and data is available
  useEffect(() => {
    if (clientsData && clientsData.length > 0 && scans.length === 0) {
      handleLoadClientData();
    }
  }, [clientsData, scans.length, handleLoadClientData]);

  const handleExportData = useCallback(() => {
    const data = scans.map((scan) => ({
      timestamp: scan.timestamp.toISOString(),
      L: scan.cieL.toFixed(2),
      a: scan.cieA.toFixed(2),
      b: scan.cieB.toFixed(2),
      hex: scan.hex,
      notes: scan.notes || '',
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `color_scans_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scans]);

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        marginLeft: 'calc(-50vw + 50%)',
        marginRight: 'calc(-50vw + 50%)',
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <CameraIcon fontSize="large" />
          Multi-Point Color Scanner
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Scanning Controls */}
        <Paper
          sx={{
            p: 3,
            borderRadius: 0,
            boxShadow: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Sensor Controls
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Connection Status */}
          {!isConnected && needsManualConnect && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Sensor not connected. Click Connect Sensor to establish
              connection.
            </Alert>
          )}

          {sensorError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {sensorError}
            </Alert>
          )}

          {scanError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {scanError}
            </Alert>
          )}

          {clientsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load client data: {clientsError.message}
            </Alert>
          )}

          {clientsData && clientsData.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {clientsData.length} client records available for upload
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Connection Controls */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                label={isConnected ? 'Connected' : 'Disconnected'}
                color={isConnected ? 'success' : 'error'}
                variant="outlined"
              />
              {needsManualConnect && (
                <Button variant="outlined" onClick={connectSensor} size="small">
                  Connect Sensor
                </Button>
              )}
            </Box>

            <TextField
              label="Scan Notes (Optional)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              size="small"
              placeholder="Enter notes for the next scan..."
              sx={{ maxWidth: '100%' }}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<CameraIcon />}
                onClick={handleScan}
                disabled={isScanning || !isConnected}
                size="large"
                sx={{ minWidth: 160 }}
              >
                {isScanning ? 'Scanning...' : 'Start Scan'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleLoadClientData}
                disabled={isLoadingClients || !clientsData}
                color="primary"
              >
                {isLoadingClients ? 'Loading...' : 'Upload Client Data'}
              </Button>

              {scans.length > 0 && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleExportData}
                    color="success"
                  >
                    Export Data
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleClearAll}
                    color="error"
                  >
                    Clear All
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Paper>

        {/* 3D Visualization */}
        <Paper
          sx={{
            p: 3,
            borderRadius: 0,
            boxShadow: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <ScatterPlotIcon />
            3D CIE Lab Color Space Visualization
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Alert severity="info" sx={{ mb: 2 }}>
            Interactive 3D visualization of your color scans positioned in CIE
            Lab color space. Use mouse to rotate, zoom, and explore the data
            points.{' '}
            {scans.length === 0
              ? 'Upload client data or start scanning to see color points.'
              : ''}
          </Alert>

          <ColorPointsDisplay {...convertScansToColorPoints(scans)} />
        </Paper>

        {/* Scan Results Table */}
        <Paper sx={{ p: 3, borderRadius: 0, boxShadow: 0 }}>
          <Typography variant="h6" gutterBottom>
            Scan Results ({scans.length} scans)
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {scans.length === 0 ? (
            <Alert severity="info">
              No scans recorded yet. Click &ldquo;Upload Client Data&rdquo; to
              load existing color data or &ldquo;Start Scan&rdquo; to begin new
              color analysis.
            </Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Scan #</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Color Sample</TableCell>
                    <TableCell>CIE L</TableCell>
                    <TableCell>CIE a</TableCell>
                    <TableCell>CIE b</TableCell>
                    <TableCell>Hex Color</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scans.map((scan, index) => (
                    <TableRow
                      key={scan.id}
                      hover
                      selected={selectedScanId === scan.id}
                      onClick={() =>
                        setSelectedScanId(
                          scan.id === selectedScanId ? undefined : scan.id,
                        )
                      }
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Chip
                          label={index + 1}
                          size="small"
                          color={
                            selectedScanId === scan.id ? 'primary' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {scan.timestamp.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            backgroundColor: scan.hex,
                            border: '1px solid #ccc',
                            borderRadius: 1,
                            boxShadow: 1,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`L: ${scan.cieL.toFixed(1)}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`a: ${scan.cieA.toFixed(1)}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`b: ${scan.cieB.toFixed(1)}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {scan.hex}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {scan.notes || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScan(scan.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default function ColorScanner() {
  return (
    <ColorSensorProvider>
      <ColorScannerContent />
    </ColorSensorProvider>
  );
}
