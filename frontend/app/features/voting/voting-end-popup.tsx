import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { DefaultButton } from '~/components/ui/default-button';

interface VotingEndPopupProps {
  handleEndButton: () => void;
  handleContinueButton: () => void;
}

export default function VotingEndPopup({
  handleEndButton,
  handleContinueButton,
}: VotingEndPopupProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg mx-4">
        <Typography variant="h4" align="center" sx={{ mb: 2 }}>
          {t('voting.exit.title')}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mb: 4 }}
        >
          {t('voting.exit.text')}
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 4 }}>
          {t('voting.exit.question')}
        </Typography>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <DefaultButton
            text={t('voting.exit.continueButton')}
            handleClick={handleContinueButton}
          />
          <DefaultButton
            text={t('voting.exit.exitButton')}
            handleClick={handleEndButton}
          />
        </div>
      </div>
    </div>
  );
}
