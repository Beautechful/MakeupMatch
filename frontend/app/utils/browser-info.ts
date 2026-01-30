export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return null;

  const userAgent = navigator.userAgent;
  const vendor = navigator.vendor || '';
  const platform = navigator.platform;

  // Browser detection - improved Chrome detection
  const isChrome =
    (/Chrome/.test(userAgent) && /Google Inc/.test(vendor)) ||
    (/Chrome/.test(userAgent) && vendor.includes('Google')) ||
    (userAgent.includes('Chrome') &&
      !userAgent.includes('Edg') &&
      !userAgent.includes('OPR')) ||
    // Fallback: If userAgent is compromised but vendor is Google Inc., likely Chrome
    (vendor === 'Google Inc.' &&
      !userAgent.includes('Safari') &&
      !userAgent.includes('Edge'));

  const isFirefox = /Firefox/.test(userAgent);
  const isSafari =
    /Safari/.test(userAgent) && /Apple/.test(vendor) && !isChrome;
  const isEdge = /Edg/.test(userAgent) || /Edge/.test(userAgent);
  const isOpera = /OPR/.test(userAgent) || /Opera/.test(userAgent);

  // Mobile detection
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );
  const isTablet =
    /iPad/.test(userAgent) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Screen info
  const screenInfo = {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth,
  };

  // Viewport info
  const viewportInfo = {
    width: window.innerWidth,
    height: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
  };

  return {
    userAgent,
    vendor,
    platform,
    browser: {
      isChrome,
      isFirefox,
      isSafari,
      isEdge,
      isOpera,
      name: isEdge
        ? 'Edge'
        : isChrome
          ? 'Chrome'
          : isFirefox
            ? 'Firefox'
            : isSafari
              ? 'Safari'
              : isOpera
                ? 'Opera'
                : 'Unknown',
    },
    device: {
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      type: isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop',
    },
    screen: screenInfo,
    viewport: viewportInfo,
    connection: (navigator as any).connection
      ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt,
        }
      : null,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    language: navigator.language,
    languages: navigator.languages,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory || 'Unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};
