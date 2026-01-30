import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TypographyMultiSize } from './typograthy-multi-size';

export function LanguagePicker() {
  const { t, i18n } = useTranslation();

  // Get language from URL parameter "tr" if present
  const getLanguageFromUrl = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    const trParam = params.get('tr');

    // Validate that the parameter is either 'en' or 'de'
    if (trParam === 'en' || trParam === 'de') {
      return trParam;
    }

    return null;
  };

  // Initialize language from URL parameter or current i18n language
  const urlLanguage = getLanguageFromUrl();
  const [language, setLanguage] = useState(urlLanguage || i18n.language);

  // Set language from URL parameter on component mount
  useEffect(() => {
    const urlLang = getLanguageFromUrl();
    if (urlLang && i18n.language !== urlLang) {
      i18n.changeLanguage(urlLang);
      setLanguage(urlLang);
    }
  }, [i18n]);

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newLanguage: string | null,
  ) => {
    if (newLanguage !== null) {
      setLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);
    }
  };

  return (
    <div className="flex items-center ">
      <ToggleButtonGroup
        value={language}
        exclusive
        onChange={handleChange}
        aria-label="language"
        sx={{
          '& .MuiToggleButtonGroup-grouped': {
            backgroundColor: 'transparent',
            px: 0.7,
            border: 'none',
            '&.Mui-selected': {
              color: '#906B4D',
            },
            '&:hover': {
              color: '#4d3725',
            },
          },
        }}
      >
        <ToggleButton
          value="de"
          aria-label="german"
          sx={{
            '&.MuiToggleButton-root': {
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'transparent',
              },
            },
          }}
        >
          <TypographyMultiSize
            text={t('languages.german')}
            variant_large="h4"
            variant_small="body1"
          />{' '}
        </ToggleButton>
        <div className="h-5 sm:h-8 w-1 bg-[#906B4D] self-center"></div>
        <ToggleButton
          value="en"
          aria-label="english"
          sx={{
            '&.MuiToggleButton-root': {
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'transparent',
              },
            },
          }}
        >
          <TypographyMultiSize
            text={t('languages.english')}
            variant_large="h4"
            variant_small="body1"
          />
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
