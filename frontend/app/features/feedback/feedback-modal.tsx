import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { IconCross } from '~/components/ui/icons';
import { FeedbackFormProvider } from '~/context/feedback-form-context';
import { FeedbackForm } from '~/features/feedback/feedback-form';
import theme from '~/styles/theme';

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  userId?: string;
};

export const FeedbackModal = ({
  open,
  onClose,
  userId,
}: FeedbackModalProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: '20px',
        },
      }}
    >
      <FeedbackFormProvider>
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
          className="flex flex-col gap-4 bg-white"
          style={{
            paddingTop: '80px',
            borderRadius: '20px',
          }}
        >
          <Typography
            variant="h3"
            fontWeight={700}
            color="text.primary"
            align={isMobile ? 'left' : 'center'}
            className="mb-2"
          >
            {t('feedback.title')}
          </Typography>
          <p className="text-left sm:text-center text-md sm:text-xl">
            {t('feedback.text')}
          </p>
          <FeedbackForm onClose={onClose} userId={userId} />
        </DialogContent>
      </FeedbackFormProvider>
    </Dialog>
  );
};
