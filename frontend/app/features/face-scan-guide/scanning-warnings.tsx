import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { DefaultButton } from '~/components/ui/default-button';
import {
  IconBrush,
  IconError,
  IconFace,
  IconPalette,
} from '~/components/ui/icons';

interface ScanningWarningsProps {
  onNextButtonClick?: () => void;
}

export const ScanningWarnings = ({
  onNextButtonClick,
}: ScanningWarningsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col max-w-3xl mx-auto text-left items-center pt-6">
      <Typography variant="h2" fontWeight={600}>
        {t('scanningWarnings.title')}
      </Typography>
      <div className="p-4 bg-[#FFF6E0] rounded-3xl my-32 flex">
        <IconError color="#FFA600" />
      </div>
      <div className="flex flex-col p-4 gap-12 mb-20">
        <p className="text-[36px] font-semibold">
          {t('scanningWarnings.text')}
        </p>

        <div className="flex flex-col gap-12 font-light text-[32px] items-start">
          <div className="flex gap-4 items-center">
            <IconBrush color="#C49E91" />
            <p>{t('scanningWarnings.makeup')}</p>
          </div>

          <div className="flex gap-4 items-center">
            <IconPalette color="#C49E91" />
            <p>{t('scanningWarnings.blush')}</p>
          </div>

          <div className="flex gap-4 items-center">
            <IconFace color="#C49E91" />
            <p>{t('scanningWarnings.birthmarks')}</p>
          </div>
        </div>
      </div>
      <DefaultButton
        size="medium"
        text={t('scanningWarnings.buttonText')}
        focus={true}
        handleClick={onNextButtonClick || (() => undefined)}
      />
    </div>
  );
};

export default ScanningWarnings;
