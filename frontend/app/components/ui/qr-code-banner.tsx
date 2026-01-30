import { Typography } from '@mui/material';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClarityContext } from '~/context/clarity';

interface QRCodeBannerProps {
  link: string;
}

export function QRCodeBanner({ link }: QRCodeBannerProps) {
  const { t, i18n } = useTranslation();
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const { getUrlWithCustomId } = useClarityContext();

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Add language parameter to the link
        const url = new URL(link);
        url.searchParams.set('tr', i18n.language);
        const linkWithLanguage = url.toString();
        const linkWithClarity = getUrlWithCustomId(linkWithLanguage);

        const dataURL = await QRCode.toDataURL(linkWithClarity, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrCodeDataURL(dataURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    if (link) {
      generateQRCode();
    }
  }, [link, i18n.language]);

  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
        {/* Phone with QR code */}
        <div className="flex-shrink-0 relative">
          <div className="relative w-125 h-125 ">
            {/* Phone frame SVG */}
            <img
              src="/phone-frame-square.svg"
              alt="Phone frame"
              className="w-full h-full"
            />

            {/* QR Code positioned inside the phone screen */}
            <div className="absolute z-10 w-40 h-40 bg-white rounded-lg p-1 flex items-center justify-center left-55/100 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {qrCodeDataURL ? (
                <img
                  src={qrCodeDataURL}
                  alt="QR Code"
                  className="w-full h-full rounded"
                />
              ) : (
                <div className="w-full h-full rounded bg-gray-200 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0">
          <img src="/arrow.svg" alt="Arrow" className="w-24 h-24 opacity-60" />
        </div>

        {/* Text content */}
        <div className="flex-1 max-w-xs text-bottom ">
          <div className="h-full align-bottom">
            <Typography variant="h5" fontWeight={600} className="text-gray-600">
              {t(
                'results.qrCodeInstructions',
                'QR-Code scannen & Ergebnisse sofort aufs Handy erhalten',
              )}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}
