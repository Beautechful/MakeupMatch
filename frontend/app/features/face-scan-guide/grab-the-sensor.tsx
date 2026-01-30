import { Typography, keyframes, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { DefaultButton } from '~/components/ui/default-button';
import { IconArrowLeft } from '~/components/ui/icons';

interface GrabTheSensorProps {
  onNextButtonClick?: () => void;
}

// Define the animation using MUI's keyframes
const pumpLeft = keyframes`
  0%, 100% { 
    transform: translateX(0px); 
  }
  50% { 
    transform: translateX(-12px); 
  }
`;

export const GrabTheSensor = ({ onNextButtonClick }: GrabTheSensorProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col max-w-3xl mx-auto text-center items-center pt-6 gap-28">
      <Typography variant="h2" fontWeight={600}>
        {t('scanningWarnings.title')}
      </Typography>
      <div className="flex flex-col gap-8 p-4 text-center items-center">
        <p className="text-[40px] font-normal">{t('grabTheSensor.text')}</p>
        <video
          width="624"
          src="/sensor_demo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="object-cover"
        />
        <div className="flex gap-4 px-12 py-8 rounded-xl bg-[#C49E9126] items-center w-full">
          <Box
            sx={{
              animation: `${pumpLeft} 1.5s ease-in-out infinite`,
            }}
          >
            <IconArrowLeft height={120} width={120} color="#C49E91" />
          </Box>
          <p className="text-[50px] font-semibold">
            {t('grabTheSensor.subtitle')}
          </p>
        </div>

        <p className="text-[32px] text-center mt-10 mb-20">
          {t('grabTheSensor.explanation')}
        </p>
        <DefaultButton
          size="medium"
          text={t('grabTheSensor.buttonText')}
          focus={true}
          handleClick={onNextButtonClick || (() => undefined)}
        />
      </div>
    </div>
  );
};

export default GrabTheSensor;
