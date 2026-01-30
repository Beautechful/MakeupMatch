import {
  type ReactNode,
  useEffect,
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';

// Declare global clarity function (loaded via script tag)
declare global {
  interface Window {
    clarity?: (action: string, ...args: any[]) => void;
  }
}

interface ClarityContextProviderProps {
  children: ReactNode;
}

interface ClarityContextType {
  customId: string;
  resetCustomId: () => void;
  getUrlWithCustomId: (baseUrl: string) => string;
  grantConsent: () => void;
  revokeConsent: () => void;
  hasConsent: () => boolean;
  endSession: () => void;
  isInitialized: boolean;
}

const ClarityContext = createContext<ClarityContextType | undefined>(undefined);

const STORAGE_KEY = 'clarity_custom_id';
const CONSENT_KEY = 'clarity_consent';

/**
 * Generate a shortened UUID (16 characters)
 */
function generateShortId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

/**
 * Get or create custom ID from URL, sessionStorage, or generate new
 * Priority: URL param > sessionStorage > generate new
 */
function getOrCreateCustomId(): string {
  if (typeof window === 'undefined') {
    return generateShortId();
  }

  // 1. Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const clParam = urlParams.get('cl');

  if (clParam && clParam.trim() !== '') {
    // console.log('[Clarity] Using custom ID from URL:', clParam);
    sessionStorage.setItem(STORAGE_KEY, clParam);

    return clParam;
  }

  // 2. Check sessionStorage
  const storedId = sessionStorage.getItem(STORAGE_KEY);
  if (storedId && storedId.trim() !== '') {
    // console.log('[Clarity] Using stored custom ID:', storedId);
    return storedId;
  }

  // 3. Generate new ID
  const newId = generateShortId();
  // console.log('[Clarity] Generated new custom ID:', newId);
  sessionStorage.setItem(STORAGE_KEY, newId);
  return newId;
}

export const ClarityContextProvider = ({
  children,
}: ClarityContextProviderProps) => {
  const projectId = 's4zq1p8icz';

  // Track if Clarity script has been initialized
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with stored/URL/generated ID
  const [customId, setCustomId] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return generateShortId();
    }
    return getOrCreateCustomId();
  });

  // Initialize Clarity script ONLY when consent is granted
  const initializeClarity = useCallback(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    // console.log(
    //   '[Clarity] Initializing Clarity script with project ID:',
    //   projectId,
    // );

    // Load Clarity script
    (function (c: any, l: any, a: any, r: any, i: any, t: any, y: any) {
      c[a] =
        c[a] ||
        function (...args: any[]) {
          (c[a].q = c[a].q || []).push(args);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', projectId, null, null);

    // Wait for Clarity to load, then set consent and identify
    const identifyUser = () => {
      if (window.clarity) {
        // console.log('[Clarity] Clarity loaded, setting up session');

        // STEP 1: Set consent FIRST
        // console.log('[Clarity] Setting consent to granted');
        window.clarity('consent', true);
        window.clarity('consentv2', {
          ad_Storage: 'granted',
          analytics_Storage: 'granted',
        });

        // STEP 2: Wait a bit for consent to register
        setTimeout(() => {
          // console.log('[Clarity] Identifying user with ID:', customId);
          if (!window.clarity) {
            console.error(
              '[Clarity] Clarity object missing during identification',
            );
            return;
          }
          window.clarity('identify', customId);

          // STEP 3: Set custom tags to help debug
          window.clarity('set', 'session_type', 'kiosk');
          window.clarity('set', 'custom_id', customId);

          setIsInitialized(true);
          // console.log('[Clarity] Session fully initialized and recording');
        }, 100); // Small delay to ensure consent registers
      } else {
        // console.log('[Clarity] Not loaded yet, retrying...');
        setTimeout(identifyUser, 100);
      }
    };

    identifyUser();
  }, [customId, isInitialized, projectId]);

  // Check if we have stored consent and initialize if needed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedConsent = sessionStorage.getItem(CONSENT_KEY);

    if (storedConsent === 'granted' && !isInitialized) {
      // console.log('[Clarity] Found stored consent, initializing...');
      initializeClarity();
    }
  }, [initializeClarity, isInitialized]);

  // Reset custom ID and generate a new one
  const resetCustomId = () => {
    if (typeof window === 'undefined') return;

    const newId = generateShortId();
    // console.log('[Clarity] Resetting custom ID to:', newId);

    // Update sessionStorage
    sessionStorage.setItem(STORAGE_KEY, newId);
    setCustomId(newId);

    // Re-identify with Clarity if already initialized
    if (window.clarity && isInitialized) {
      window.clarity('identify', newId);
    }
  };

  // End current session and prepare for next user (kiosk mode)
  const endSession = useCallback(() => {
    if (typeof window === 'undefined') return;

    // console.log('[Clarity] Ending session and preparing for next user');

    // STEP 1: Remove Clarity scripts from DOM
    const clarityScripts = document.querySelectorAll(
      'script[src*="clarity.ms"]',
    );
    clarityScripts.forEach((script) => {
      // console.log(
      //   '[Clarity] Removing Clarity script:',
      //   (script as HTMLScriptElement).src,
      // );
      script.remove();
    });

    // STEP 2: Clear the global Clarity object
    if (window.clarity) {
      // console.log('[Clarity] Deleting window.clarity');
      delete window.clarity;
    }

    // STEP 3: Clear all Clarity-related window objects
    Object.keys(window).forEach((key) => {
      if (key.toLowerCase().includes('clarity') || key.startsWith('_clar')) {
        try {
          // console.log('[Clarity] Removing window object:', key);
          delete (window as any)[key];
        } catch (e) {
          // Some properties might be non-configurable
          console.warn('[Clarity] Could not delete:', key, e);
        }
      }
    });

    // STEP 4: Clear ALL sessionStorage (nuclear option for clean slate)
    // console.log('[Clarity] Clearing all sessionStorage');
    sessionStorage.clear();

    // STEP 5: Clear Clarity-related items from localStorage
    // console.log('[Clarity] Clearing Clarity items from localStorage');
    Object.keys(localStorage).forEach((key) => {
      if (
        key.toLowerCase().includes('clarity') ||
        key.toLowerCase().includes('_clar') ||
        key.toLowerCase().includes('clck')
      ) {
        // console.log('[Clarity] Removing localStorage item:', key);
        localStorage.removeItem(key);
      }
    });

    // STEP 6: Clear Clarity cookies
    // console.log('[Clarity] Clearing Clarity cookies');
    document.cookie.split(';').forEach((c) => {
      const cookie = c.trim();
      if (
        cookie.toLowerCase().includes('clarity') ||
        cookie.toLowerCase().includes('_clar') ||
        cookie.toLowerCase().includes('_clck') ||
        cookie.toLowerCase().includes('_clsk')
      ) {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        // console.log('[Clarity] Removing cookie:', name);
        // Remove for current path
        document.cookie =
          name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        // Remove for current domain
        document.cookie =
          name +
          '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' +
          window.location.hostname;
        // Remove for parent domain (if applicable)
        const domainParts = window.location.hostname.split('.');
        if (domainParts.length > 2) {
          const parentDomain = domainParts.slice(-2).join('.');
          document.cookie =
            name +
            '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' +
            parentDomain;
        }
      }
    });

    // STEP 7: Reset state for next user
    setIsInitialized(false);

    // console.log('[Clarity] Complete cleanup finished');
    // console.log('[Clarity] Ready for next user');
  }, []); // Empty deps - cleanup doesn't depend on state

  // Get URL with customId as parameter
  const getUrlWithCustomId = (baseUrl: string): string => {
    if (!customId) return baseUrl;

    try {
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set('cl', customId);
      return url.toString();
    } catch (error) {
      console.error('Error adding customId to URL:', error);
      return baseUrl;
    }
  };

  // Grant consent for Clarity tracking using API v2
  const grantConsent = () => {
    if (typeof window === 'undefined') return;

    // console.log('[Clarity] Granting consent');

    // Store consent in sessionStorage
    sessionStorage.setItem(CONSENT_KEY, 'granted');

    // Initialize Clarity if not already initialized
    if (!isInitialized) {
      initializeClarity();
    } else if (window.clarity) {
      // If already initialized (shouldn't happen), update consent
      window.clarity('consent', true);
      window.clarity('consentv2', {
        ad_Storage: 'granted',
        analytics_Storage: 'granted',
      });
    }
  };

  // Revoke consent for Clarity tracking using API v2
  const revokeConsent = () => {
    if (typeof window === 'undefined') return;

    // console.log('[Clarity] Revoking consent');

    // Remove consent from sessionStorage
    sessionStorage.removeItem(CONSENT_KEY);

    // Send denial signal to Clarity if initialized
    if (window.clarity && isInitialized) {
      window.clarity('consent', false);
      window.clarity('consentv2', {
        ad_Storage: 'denied',
        analytics_Storage: 'denied',
      });
    }
  };

  // Check if user has granted consent
  const hasConsent = (): boolean => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(CONSENT_KEY) === 'granted';
  };

  const contextValue: ClarityContextType = {
    customId,
    resetCustomId,
    getUrlWithCustomId,
    grantConsent,
    revokeConsent,
    hasConsent,
    endSession,
    isInitialized,
  };

  return (
    <ClarityContext.Provider value={contextValue}>
      {children}
    </ClarityContext.Provider>
  );
};

// Hook to use Clarity context
export const useClarityContext = () => {
  const context = useContext(ClarityContext);
  if (context === undefined) {
    throw new Error(
      'useClarityContext must be used within ClarityContextProvider',
    );
  }
  return context;
};
