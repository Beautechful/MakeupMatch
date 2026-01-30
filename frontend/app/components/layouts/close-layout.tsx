import { IconButton } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useClarityContext } from '~/context/clarity';
import { ConfirmAutoExitModal } from '~/features/auto-exit-modal.tsx/auto-exit-modal';
import { ConfirmExitModal } from '~/features/results/components/confirm-exit-modal';
import { clearAllResultsFromStorage } from '~/features/results/result-api';

import { IconCross } from '../ui/icons';

export function CloseLayout({ children }: { children: React.ReactNode }) {
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [isConfirmAutoExitOpen, setIsConfirmAutoExitOpen] = useState(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { endSession } = useClarityContext();
  const isLocalDev = import.meta.env.DEV;

  const handleOpenConfirmExit = () => setIsConfirmExitOpen(true);
  const handleCloseConfirmExit = () => setIsConfirmExitOpen(false);
  const handleOnConfirmExit = () => {
    // End the current Clarity session before returning to welcome
    endSession();
    clearAllResultsFromStorage();
    // onClose();
    window.location.href = '/';
  };
  const handleCloseAutoConfirmExit = () => setIsConfirmAutoExitOpen(false);
  const handleOpenAutoConfirmExit = () => setIsConfirmAutoExitOpen(true);

  const timeout = 60000; // 60 seconds

  // Check if device is mobile
  const isMobile = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  };

  // Reset inactivity timer (disabled on mobile)
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Only set new timer if no modals are open and not on mobile and not development
    if (
      !isConfirmExitOpen &&
      !isConfirmAutoExitOpen &&
      !isMobile() &&
      !isLocalDev
    ) {
      inactivityTimeoutRef.current = setTimeout(() => {
        handleOpenAutoConfirmExit();
      }, timeout);
    }
  }, [isConfirmExitOpen, isConfirmAutoExitOpen, timeout]);

  // Set up inactivity detection
  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Start the timer on component mount
    resetInactivityTimer();

    // Add event listeners for user activity
    events.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    // Cleanup function
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
    };
  }, [isConfirmExitOpen, isConfirmAutoExitOpen, resetInactivityTimer]);

  // Clear timer when modals are open
  useEffect(() => {
    if (isConfirmExitOpen || isConfirmAutoExitOpen) {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    } else {
      // Restart timer when modals close
      resetInactivityTimer();
    }
  }, [isConfirmExitOpen, isConfirmAutoExitOpen, resetInactivityTimer]);

  if (isMobile()) {
    return <div className="h-dvh flex flex-col">{children}</div>;
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* Close icon fixed in top-right corner */}
      <IconButton
        onClick={handleOpenConfirmExit}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <IconCross width={30} height={30} color="#1E1E1E" />
      </IconButton>
      {children}
      <ConfirmExitModal
        open={isConfirmExitOpen}
        onClose={handleCloseConfirmExit}
        onConfirmExit={handleOnConfirmExit}
      />
      <ConfirmAutoExitModal
        open={isConfirmAutoExitOpen}
        onClose={handleCloseAutoConfirmExit}
        onConfirmExit={handleOnConfirmExit}
      />
    </div>
  );
}
