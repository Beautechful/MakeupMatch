import CheckIcon from '@mui/icons-material/Check';
import { CircularProgress } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { DefaultButton } from '~/components/ui/default-button';
import { useScanColor } from '~/context/color-sensor';
import { useMainFormContext } from '~/context/main-form-context';

// for on device color scanning application
// import { useGetSensorData } from '../hooks/use-get-sensor-data';

interface SpotDisplayProps {
  questionnaireIndex: number;
  number: number;
  color: string;
  text?: string;
  disabled?: boolean;
  focus?: boolean;
  focusTimeout?: number;
  onClick?: () => void;
}

export function SpotDisplay({
  questionnaireIndex,
  number,
  color,
  text,
  disabled,
  focus = false,
  focusTimeout = 3000,
}: SpotDisplayProps) {
  const { t } = useTranslation();
  const { methods } = useMainFormContext();
  // const { isConnected, error: connectionError } = useColorSensor();

  // New scan hook with trigger, data, and isPending
  const { trigger, data, isPending } = useScanColor();

  const handleClick = () => {
    trigger();
  };

  // Save scan result to form when data is available
  React.useEffect(() => {
    if (data && data.values) {
      methods.setValue(
        `answers[${questionnaireIndex}].value[${number - 1}]` as any,
        data.values,
      );
    }
  }, [data, number, methods]);
  const size_rem =
    typeof window !== 'undefined' && window.innerWidth >= 1024
      ? '2rem'
      : '1.5rem';
  return (
    <div className="flex flex-row items-center gap-4">
      <span
        className="
          rounded-full border border-gray-300 transition-shadow duration-200 group-hover:shadow-lg flex items-center justify-center
          w-9 h-9
          lg:w-18 lg:h-18
          shrink-0
        "
        style={{ backgroundColor: !data ? color : data.hex_value }}
      >
        {isPending ? (
          <CircularProgress color="secondary" size={size_rem} />
        ) : data?.hex_value ? (
          <CheckIcon htmlColor="background" style={{ fontSize: size_rem }} />
        ) : null}
      </span>
      <DefaultButton
        text={text || `${t('sensorAnalysis.spot')} ${number}`}
        handleClick={handleClick}
        fullWidth={true}
        disabled={disabled || isPending}
        focus={focus}
        focusTimeout={focusTimeout}
      />
    </div>
  );
}
