import { Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { ConsentPopup } from '~/components/consent-popup';
import { DefaultButton } from '~/components/ui/default-button';
import { useClarityContext } from '~/context/clarity';

import type { Route } from './+types/welcome';

// eslint-disable-next-line
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Makeup Match' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Welcome() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [showConsentPopup, setShowConsentPopup] = useState(false);
  const { resetCustomId, grantConsent, revokeConsent } = useClarityContext();

  // No useEffect needed! Clarity won't initialize until consent is granted

  const handleStartAnalysis = () => {
    // Just show consent popup, don't reset ID yet
    setShowConsentPopup(true);
  };

  const handleConsentAccept = () => {
    // Generate new ID for this user session
    resetCustomId();
    // Grant consent - THIS is when Clarity initializes and session starts
    grantConsent();
    setShowConsentPopup(false);

    // Small delay to let Clarity register the welcome page
    setTimeout(() => {
      navigate('/questionnaire');
    }, 100);
  };

  const handleConsentDecline = () => {
    // Revoke consent using the new function
    revokeConsent();
    setShowConsentPopup(false);
    // Stay on welcome page after declining
  };

  const handleConsentClose = () => {
    // Just close the popup without proceeding
    setShowConsentPopup(false);
  };

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden">
      {/* Background Image */}
      <div className="flex inset-0 portrait:lg:pt-30">
        <video
          src="/Starting-Video-MM.mp4"
          className="w-full h-2/3 object-cover"
          autoPlay
          loop
          muted
        />
      </div>

      <div className="flex-4 flex items-center justify-center px-6">
        <div className="m-15 flex items-center justify-center">
          <div
            style={{
              transform: 'scale(1.5)',
              transformOrigin: 'center',
              display: 'inline-block',
            }}
          >
            <DefaultButton
              text={t('startPage.startAnalysis')}
              handleClick={handleStartAnalysis}
              size="xlarge"
              focus={true}
              focusTimeout={1000}
              shadowColor={theme.palette.border.shadow}
              style={{
                backgroundColor: theme.palette.secondary.main,
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section with Text - Only visible on mobile */}
      <div className="flex-1 m-2 bg-white px-6 py-8 text-center">
        {/* Main Heading */}
        {/* For phones */}
        <div className="block sm:hidden">
          <Typography
            variant="h4"
            component="h1"
            fontWeight={800}
            color="text.primary"
            className="mb-2"
          >
            {t('startPage.welcome_line1')}
          </Typography>
          <Typography
            variant="h4"
            component="h1"
            fontWeight={800}
            color="text.primary"
            className="mb-2"
          >
            {t('startPage.welcome_line2')}
          </Typography>
        </div>
        <div className="hidden lg:block">
          <Typography
            variant="h2"
            component="h1"
            fontWeight={800}
            color="text.primary"
            className="mb-2"
          >
            {t('startPage.welcome_line1')}
          </Typography>
          <Typography
            variant="h2"
            component="h1"
            fontWeight={800}
            color="text.primary"
            className="mb-2"
          >
            {t('startPage.welcome_line2')}
          </Typography>
        </div>
      </div>

      {/* Consent Popup */}
      <ConsentPopup
        isOpen={showConsentPopup}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
        onClose={handleConsentClose}
      />
    </div>
  );
}
