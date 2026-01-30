import { Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FeedbackModal } from '~/features/feedback/feedback-modal';

interface ResultLayoutProps {
  children: ReactNode;
  userId?: string;
}

export function ResultLayout({ children, userId }: ResultLayoutProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const handleOpenFeedback = () => setIsFeedbackOpen(true);
  const handleCloseFeedback = () => setIsFeedbackOpen(false);

  return (
    <div className="flex flex-col flex-grow pt-20 w-full h-full overflow-y-scroll">
      <div className="absolute top-6 right-16 z-20 w-auto">
        <div className="flex flex-row gap-2 items-center">
          <Button
            size="small"
            onClick={handleOpenFeedback}
            style={{
              background: theme.palette.background.default,
              color: theme.palette.text.primary,
              boxShadow: 'none',
              outline: `1px solid ${theme.palette.primary.light}`,
            }}
          >
            {t('results.feedback')}
          </Button>
        </div>
      </div>
      {children}
      <FeedbackModal
        open={isFeedbackOpen}
        onClose={handleCloseFeedback}
        userId={userId}
      />
    </div>
  );
}
