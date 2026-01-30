import React from 'react';

import { useColorSensor, useScanColor } from '~/context/color-sensor';

// Example component showing how to use both hooks
export const ColorScannerExample: React.FC = () => {
  // Context hook for general device status
  const {
    isConnected,
    error: connectionError,
    connectSensor,
    needsManualConnect,
  } = useColorSensor();

  // New scan hook with trigger, data, and isPending
  const { trigger, data, isPending, error: scanError } = useScanColor();

  const handleScan = () => {
    trigger(); // Simply call trigger, no need for async/await
  };

  const handleConnect = async () => {
    await connectSensor();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Nix Color Scanner</h2>

      <div className="mb-4">
        <p>Device Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
        {connectionError && (
          <p className="text-red-500">Connection Error: {connectionError}</p>
        )}
        {scanError && <p className="text-red-500">Scan Error: {scanError}</p>}
      </div>

      {needsManualConnect && (
        <div className="mb-4">
          <button
            onClick={handleConnect}
            className="bg-green-600 text-white px-4 py-2 rounded mb-2"
          >
            Connect Sensor
          </button>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={handleScan}
          disabled={isPending || !isConnected}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isPending ? 'Scanning...' : 'Scan Color'}
        </button>
      </div>

      {data && (
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Last Scan Result:</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="font-medium">L*:</span>{' '}
              {data.values[0].toFixed(2)}
            </div>
            <div>
              <span className="font-medium">a*:</span>{' '}
              {data.values[1].toFixed(2)}
            </div>
            <div>
              <span className="font-medium">b*:</span>{' '}
              {data.values[2].toFixed(2)}
            </div>
            <div>
              <span className="font-medium">HEX:</span> {data.hex_value}
              <span
                className="inline-block w-6 h-6 ml-2 rounded border border-gray-300 align-middle"
                style={{ backgroundColor: data.hex_value }}
                title={data.hex_value}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorScannerExample;
