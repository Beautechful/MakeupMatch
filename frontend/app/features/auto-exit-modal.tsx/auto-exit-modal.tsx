import {
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { IconCross, IconSandClock } from '~/components/ui/icons';

type ConfirmAutoExitModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
};

export const ConfirmAutoExitModal = ({
  open,
  onClose,
  onConfirmExit,
}: ConfirmAutoExitModalProps) => {
  const { t } = useTranslation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeout = 10000; // 10 seconds

  // Auto-exit after 10 seconds of inactivity
  useEffect(() => {
    if (open) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for 10 seconds
      timeoutRef.current = setTimeout(() => {
        onConfirmExit();
      }, timeout);
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [open, onConfirmExit]);

  // Reset timer on any user interaction
  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onConfirmExit();
      }, timeout);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      className="p-20"
      PaperProps={{
        sx: {
          borderRadius: '20px',
        },
      }}
      onMouseMove={resetTimer}
      onKeyDown={resetTimer}
      onClick={resetTimer}
    >
      <IconButton
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <IconCross />
      </IconButton>
      <DialogContent
        className="flex flex-col gap-10 bg-white text-center items-center"
        style={{
          padding: '48px',
          paddingTop: '80px',
          borderRadius: '20px',
        }}
      >
        <IconSandClock width={300} height={300} color="#1E1E1E" />
        <Typography
          variant="h3"
          fontWeight={600}
          color="text.primary"
          className="mb-2"
        >
          {t('autoExit.title')}
        </Typography>
        <div className="w-full flex flex-col gap-6">
          <Button
            variant="contained"
            size="medium"
            onClick={onClose}
            style={{
              fontSize: '20px',
              fontWeight: 600,
            }}
          >
            {t('autoExit.cancelButton')}
          </Button>
          <Button
            variant="outlined"
            size="medium"
            className="font-semibold text-xl"
            onClick={onConfirmExit}
            style={{
              fontSize: '20px',
              fontWeight: 600,
            }}
          >
            {t('autoExit.confirmButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
