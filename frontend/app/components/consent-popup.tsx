import {
  Checkbox,
  FormControlLabel,
  IconButton,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import theme from '~/styles/theme';

import { DefaultButton } from './ui/default-button';

interface ConsentData {
  title: string;
  subtitle: string;
  date: string;
  content: string;
  consent: string;
  buttons: {
    accept: string;
    decline: string;
  };
}

interface ConsentPopupProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export function ConsentPopup({
  isOpen,
  onAccept,
  onDecline,
  onClose,
}: ConsentPopupProps) {
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeout = 60000; // 60 seconds

  useEffect(() => {
    if (isOpen) {
      // Load both JSON metadata and text content
      Promise.all([
        fetch('/legal/consent-text.json').then((response) => response.json()),
        fetch('/legal/consent.txt').then((response) => response.text()),
      ])
        .then(([jsonData, textContent]) => {
          setConsentData({
            ...jsonData,
            content: textContent,
          });
        })
        .catch((error) => console.error('Error loading consent data:', error));
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset checkbox and PDF view when popup is opened
    if (isOpen) {
      setIsChecked(false);
      setShowPdf(false);
    }
  }, [isOpen]);

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    if (isOpen) {
      inactivityTimeoutRef.current = setTimeout(() => {
        onClose();
      }, closeTimeout);
    }
  };

  // Set up inactivity detection for auto-close
  useEffect(() => {
    if (!isOpen) return;

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Start the timer when popup opens
    resetInactivityTimer();

    // Add event listeners for user activity
    events.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    // Cleanup function
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
    };
  }, [isOpen, onClose]);

  const togglePdfView = () => {
    setShowPdf(!showPdf);
  };

  const handleAccept = () => {
    if (isChecked) {
      onAccept();
    }
  };

  const handleDecline = () => {
    setIsChecked(false);
    onDecline();
  };

  const handleClose = () => {
    setIsChecked(false);
    onClose();
  };

  if (!isOpen || !consentData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-[5%]">
      <div className="bg-white rounded-lg w-full h-full max-w-none max-h-none overflow-hidden relative shadow-2xl flex flex-col landscape:max-w-[60vh] landscape:h-[90vh] landscape:w-auto">
        {/* Close Button */}
        <div className="w-full z-10 flex justify-end flex-shrink-0 p-2">
          <IconButton
            onClick={handleClose}
            className="z-10"
            sx={{
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <span
              className="text-xl flex items-center justify-center w-6 h-6"
              style={{ minWidth: '1.5rem', minHeight: '1.5rem' }}
            >
              ×
            </span>
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-6 pt-0 flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="text-center mb-6 flex-shrink-0">
            <Typography
              variant="h4"
              component="h1"
              fontWeight={600}
              className="mb-4"
              color="text.primary"
            >
              {consentData.title}
            </Typography>
            <Typography
              variant="h5"
              component="h2"
              fontWeight={500}
              className="mb-4"
              color="text.primary"
            >
              {consentData.subtitle}
            </Typography>
            <Typography variant="h6" color="text.secondary" className="mb-6">
              {consentData.date}
            </Typography>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto mb-6 px-2 min-h-0">
            {!showPdf ? (
              <Typography
                variant="body1"
                className="text-justify leading-relaxed whitespace-pre-line"
                color="text.primary"
                sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}
              >
                {consentData.content}
              </Typography>
            ) : (
              <iframe
                src="/legal/Datenschutzerklärung.pdf#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0&view=FitH"
                className="w-full h-full border-0"
                title="Datenschutzerklärung"
                style={{
                  overflow: 'hidden',
                  border: 'none',
                  outline: 'none',
                }}
              />
            )}
          </div>

          {/* Toggle Button */}
          <div className="text-center mb-6 flex-shrink-0">
            <button
              onClick={togglePdfView}
              className="text-base underline py-2 px-4"
              style={{
                color: theme.palette.primary.main,
              }}
            >
              {!showPdf ? 'Datenschutzerklärung anzeigen' : 'Zurück zum Text'}
            </button>
          </div>

          {/* Checkbox */}
          <div className="mb-8 flex-shrink-0">
            <FormControlLabel
              control={
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  sx={{
                    color: 'primary.main',
                    '&.Mui-checked': {
                      color: 'primary.main',
                    },
                    '& .MuiSvgIcon-root': {
                      fontSize: '3rem',
                    },
                  }}
                />
              }
              label={
                <Typography
                  variant="h6"
                  className="text-base ml-4"
                  color="text.primary"
                >
                  {consentData.consent}
                </Typography>
              }
              sx={{
                alignItems: 'flex-start',
                margin: 0,
              }}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <DefaultButton
              text={consentData.buttons.decline}
              handleClick={handleDecline}
              fullWidth
              size="large"
              style={{
                backgroundColor: isChecked
                  ? theme.palette.primary.main
                  : theme.palette.border.shadow,
                color: isChecked
                  ? theme.palette.background.default
                  : theme.palette.text.secondary,
                padding: '12px 24px',
                fontSize: '1.1rem',
              }}
            />
            <DefaultButton
              text={consentData.buttons.accept}
              handleClick={handleAccept}
              disabled={!isChecked}
              fullWidth
              size="large"
              style={{
                backgroundColor: isChecked
                  ? theme.palette.primary.main
                  : theme.palette.border.shadow,
                color: isChecked
                  ? theme.palette.background.default
                  : theme.palette.text.secondary,
                padding: '12px 24px',
                fontSize: '1.1rem',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
