import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAuth } from '~/firebase/auth-provider';
import { api } from '~/utils/api-client';

// Define the monitoring context type
interface MonitoringContextType {
  isOnline: boolean;
  lastHeartbeat: Date | null;
  error: string | null;
  sendHeartbeat: () => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(
  undefined,
);

export const MonitoringProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, token, refreshToken } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTokenRefreshRef = useRef<number>(Date.now());

  const sendHeartbeat = async () => {
    if (!user) {
      console.warn('User not authenticated, skipping heartbeat');
      return;
    }

    try {
      let currentToken = token;

      // Only refresh token if it's been more than 30 minutes since last refresh
      // (Firebase tokens expire after 1 hour, so refresh at 30 min to be safe)
      const timeSinceLastRefresh = Date.now() - lastTokenRefreshRef.current;
      const thirtyMinutesInMs = 30 * 60 * 1000;

      if (refreshToken && timeSinceLastRefresh > thirtyMinutesInMs) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            currentToken = newToken;
            lastTokenRefreshRef.current = Date.now();
            console.log('Token refreshed (last refresh was >30min ago)');
          }
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          // Try with existing token anyway
        }
      }

      if (!currentToken) {
        console.warn('No token available, skipping heartbeat');
        return;
      }

      try {
        const data = await api.post(
          '/devices/heartbeat',
          { status: 'running' },
          { token: currentToken },
        );

        console.log('Heartbeat sent successfully:', data);
        setIsOnline(true);
        setLastHeartbeat(new Date());
        setError(null);
      } catch (error: any) {
        // If we get 401, token might be expired - try refreshing once
        if (error.message?.includes('401') && refreshToken) {
          console.log('Got 401, attempting token refresh...');
          const newToken = await refreshToken();
          if (newToken) {
            currentToken = newToken;
            lastTokenRefreshRef.current = Date.now();

            // Retry the request with new token
            const retryData = await api.post(
              '/devices/heartbeat',
              { status: 'running' },
              { token: currentToken },
            );

            console.log(
              'Heartbeat sent successfully after token refresh:',
              retryData,
            );
            setIsOnline(true);
            setLastHeartbeat(new Date());
            setError(null);
            return;
          }
        }

        throw error;
      }
    } catch (err) {
      console.error('Failed to send heartbeat:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsOnline(false);
    }
  };

  // Set up heartbeat interval (every 3 minutes)
  useEffect(() => {
    if (!user || !token) {
      return;
    }

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval for subsequent heartbeats
    intervalRef.current = setInterval(
      () => {
        sendHeartbeat();
      },
      3 * 60 * 1000,
    ); // 3 minutes

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const value = {
    isOnline,
    lastHeartbeat,
    error,
    sendHeartbeat,
  };

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};
