import { Typography, keyframes, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { DefaultButton } from '~/components/ui/default-button';
import { IconArrowLeft } from '~/components/ui/icons';

interface LeaveTheSensorProps {
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

export const LeaveTheSensor = ({ onNextButtonClick }: LeaveTheSensorProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col max-w-3xl mx-auto text-center items-center pt-6 gap-28">
      <Typography variant="h2" fontWeight={600}>
        {t('scanningWarnings.title')}
      </Typography>
      <div className="flex flex-col gap-8 p-4 text-center items-center">
        <p className="text-[40px] font-normal">{t('leaveTheSensor.text')}</p>
        <video
          width="624"
          src="/leave_sensor.mp4"
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
          <p className="text-[45px] font-semibold">
            {t('leaveTheSensor.subtitle')}
          </p>
        </div>

        <p className="text-[32px] text-center mt-10 mb-8">
          {t('leaveTheSensor.explanation')}
        </p>
        <DefaultButton
          size="medium"
          text={t('leaveTheSensor.buttonText')}
          focus={true}
          handleClick={onNextButtonClick || (() => undefined)}
        />
      </div>
    </div>
  );
};

export default LeaveTheSensor;
