import { colord, extend } from 'colord';
import labPlugin from 'colord/plugins/lab';
import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react';

extend([labPlugin]);

import NixSerialCommunication from '~/utils/nix-communication';

// Define the color data type
interface ColorData {
  values: [number, number, number];
  hex_value: string;
}

// Define the color sensor context type
interface ColorSensorContextType {
  scanColor: () => Promise<ColorData | null>;
  connectSensor: () => Promise<boolean>;
  isConnected: boolean;
  isScanning: boolean;
  error: string | null;
  needsManualConnect: boolean;
}

// Define the scan color hook return type
interface UseScanColorReturn {
  trigger: () => void;
  data: ColorData | null;
  isPending: boolean;
  error: string | null;
}

const ColorSensorContext = createContext<ColorSensorContextType | undefined>(
  undefined,
);

export const ColorSensorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const nixRef = useRef<NixSerialCommunication | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsManualConnect, setNeedsManualConnect] = useState(false);
  const isInitializingRef = useRef(false);
  // Try automatic connection on mount
  useEffect(() => {
    nixRef.current = new NixSerialCommunication(true);
    const tryAutoConnect = async () => {
      try {
        setNeedsManualConnect(false);
        setError(null);
        if (!nixRef.current) {
          setNeedsManualConnect(true);
          setIsConnected(false);
          setError('Nix communication not initialized.');
          return;
        }
        const ports = await nixRef.current.getConnectedPorts();
        const nixPorts = ports.filter((p) => p.vendorId === 0x2af6);
        if (nixPorts.length > 0) {
          await nixRef.current.connect(nixPorts[0].port);
          setIsConnected(true);
          setError(null);
        } else {
          setNeedsManualConnect(true);
          setIsConnected(false);
          setError('No Nix devices found. Please connect manually.');
        }
      } catch (err) {
        setNeedsManualConnect(true);
        setIsConnected(false);
        setError(
          'Automatic connection failed. Please connect manually.' +
            (err instanceof Error ? ` Error: ${err.message}` : ''),
        );
      }
    };
    tryAutoConnect();
    return () => {
      if (nixRef.current) {
        nixRef.current.disconnect().catch(console.error);
        nixRef.current = null;
      }
      isInitializingRef.current = false;
    };
  }, []);

  // Manual connect method (user gesture)
  const connectSensor = async (): Promise<boolean> => {
    if (!nixRef.current) {
      throw new Error('Nix communication not initialized');
    }
    if (isInitializingRef.current) return false;
    isInitializingRef.current = true;
    try {
      setError(null);
      setNeedsManualConnect(false);
      // Use requestPort to trigger browser prompt
      const portInfo = await nixRef.current.requestNixDevice();
      await nixRef.current.connect(portInfo.port);
      setIsConnected(true);
      setError(null);
      return true;
    } catch (err) {
      setIsConnected(false);
      setNeedsManualConnect(true);
      setError(err instanceof Error ? err.message : 'Manual connection failed');
      return false;
    } finally {
      isInitializingRef.current = false;
    }
  };

  const scanColor = async (): Promise<ColorData | null> => {
    if (!nixRef.current) {
      setError('Nix communication not initialized');
      return null;
    }
    if (!isConnected) {
      setError('Sensor not connected. Please connect first.');
      setNeedsManualConnect(true);
      return null;
    }
    setIsScanning(true);
    setError(null);
    try {
      console.log('🎯 Starting color scan...');
      const [l, a, b] = await nixRef.current.getCIELAB();
      const hexColor = colord({ l: l, a: a, b: b }).toHex();
      console.log(
        `✅ Scan successful! L*a*b* values: L=${l}, a=${a}, b=${b} (HEX: ${hexColor})`,
      );
      return { values: [l, a, b], hex_value: hexColor };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setIsConnected(false);
      setNeedsManualConnect(true);
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  const contextValue: ColorSensorContextType = {
    scanColor,
    connectSensor,
    isConnected,
    isScanning,
    error,
    needsManualConnect,
  };

  return (
    <ColorSensorContext.Provider value={contextValue}>
      {children}
    </ColorSensorContext.Provider>
  );
};

export function useColorSensor() {
  const context = useContext(ColorSensorContext);
  if (!context) {
    throw new Error('useColorSensor must be used within a ColorSensorProvider');
  }
  return context;
}

// New hook for scan color with trigger, data, and isPending
export function useScanColor(): UseScanColorReturn {
  const { scanColor } = useColorSensor();
  const [data, setData] = useState<ColorData | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async () => {
    setIsPending(true);
    setError(null);

    try {
      const result = await scanColor();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, [scanColor]);

  return {
    trigger,
    data,
    isPending,
    error,
  };
}
