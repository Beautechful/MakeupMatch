import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { DefaultButton } from '~/components/ui/default-button';

interface VotingWelcomeProps {
  handleButton: () => void;
}

export default function VotingWelcome({ handleButton }: VotingWelcomeProps) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center">
      <div>
        <Typography variant="h3" align="center" sx={{ mt: 4 }}>
          {t('voting.welcome.title')}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mt: 2, px: 4 }}
        >
          {t('voting.welcome.text')}
        </Typography>
        <div className="mt-8 flex justify-center">
          <DefaultButton
            text={t('voting.welcome.startButton')}
            handleClick={handleButton}
            size="large"
          />
        </div>
        <Typography
          variant="body2"
          fontStyle="italic"
          color="text.secondary"
          align="center"
          sx={{ mt: 2, px: 4 }}
        >
          {t('voting.welcome.privacyNotice')}
        </Typography>
      </div>
    </div>
  );
}
