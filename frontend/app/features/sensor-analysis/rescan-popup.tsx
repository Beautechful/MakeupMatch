import CachedIcon from '@mui/icons-material/Cached';
import {
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { IconCross } from '~/components/ui/icons';

type RescanPopupModalProps = {
  open: boolean;
  onClose: () => void;
};

export const RescanPopupModal = ({ open, onClose }: RescanPopupModalProps) => {
  const { t } = useTranslation();

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
        <IconCross width={30} height={30} color="#1E1E1E" />
      </IconButton>
      <DialogContent
        className="flex flex-col gap-10 bg-white text-center items-center"
        style={{
          padding: '48px',
          paddingTop: '80px',
          borderRadius: '20px',
        }}
      >
        <CachedIcon sx={{ fontSize: 200 }} />
        <Typography
          variant="h3"
          fontWeight={600}
          color="text.primary"
          className="mb-2"
        >
          {t('sensorAnalysis.rescanPopup.title')}
        </Typography>
        <Typography variant="h5" fontWeight={400}>
          {t('sensorAnalysis.rescanPopup.text')}
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
            {t('sensorAnalysis.rescanPopup.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
