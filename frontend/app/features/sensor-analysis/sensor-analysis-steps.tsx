import CheckIcon from '@mui/icons-material/Check';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { DefaultButton } from 'app/components/ui/default-button';
import { QuestinnairePages } from 'app/types/pages-enum';
import { IconFace, IconTarget, IconCheck } from '~/components/ui/icons';
import { QuestionnaireTitle } from '~/components/ui/questionnaire-title';
import { ScanProgress } from '~/components/ui/scan-progress';
import { ColorSensorProvider, useScanColor } from '~/context/color-sensor';
import { useMainFormContext } from '~/context/main-form-context';

import { RescanPopupModal } from './rescan-popup';

interface SensorAnalysisProps {
  questionnaireIndex: number;
  handleClick: (nextPage: QuestinnairePages) => void;
}

function validateColorData(data: any): boolean {
  // check is data is in a vald skin color box range
  const L_range = [29, 68];
  const a_range = [3, 21];
  const b_range = [6, 27];
  if (!data || !data.values || data.values.length < 3) {
    return false;
  }
  const [L, a, b] = data.values;
  return (
    L >= L_range[0] &&
    L <= L_range[1] &&
    a >= a_range[0] &&
    a <= a_range[1] &&
    b >= b_range[0] &&
    b <= b_range[1]
  );
}

// Inner component that uses the color sensor hook
export function SensorAnalysisContent({
  questionnaireIndex,
  handleClick,
}: SensorAnalysisProps) {
  const { t } = useTranslation();
  const { methods } = useMainFormContext();
  const theme = useTheme();
  const [currentSpot, changeSpot] = useState(0);
  const { trigger, data, isPending } = useScanColor();
  const [isScanDelay, setIsScanDelay] = useState(false);
  const [isVideoRunning, setIsVideoRunning] = useState(false);
  const [isRescanModalOpen, setIsRescanModalOpen] = useState(false);
  const [errorState, setErrorState] = useState<null | number>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const numberOfSpots = 3;

  // Refs for video elements to preload them
  const foreheadVideoRef = React.useRef<HTMLVideoElement>(null);
  const cheekVideoRef = React.useRef<HTMLVideoElement>(null);
  const neckVideoRef = React.useRef<HTMLVideoElement>(null);
  const homeVideoRef = React.useRef<HTMLVideoElement>(null);

  // Keep a ref of the latest spot to avoid useEffect dependency loop
  const currentSpotRef = React.useRef(0);
  useEffect(() => {
    currentSpotRef.current = currentSpot;
  }, [currentSpot]);

  // Preload and play the appropriate video when spot changes
  useEffect(() => {
    const videos = [
      foreheadVideoRef,
      cheekVideoRef,
      neckVideoRef,
      homeVideoRef,
    ];
    videos.forEach((videoRef, index) => {
      if (videoRef.current) {
        if (index === currentSpot) {
          // Play the current video
          videoRef.current.currentTime = 0; // Reset to start
          setIsVideoRunning(true);
          videoRef.current.play().catch((err) => {
            console.warn('Video play failed:', err);
            setIsVideoRunning(false);
          });

          // Set up ended event listener
          const handleVideoEnded = () => {
            setIsVideoRunning(false);
          };
          videoRef.current.addEventListener('ended', handleVideoEnded);

          // Cleanup listener
          return () => {
            videoRef.current?.removeEventListener('ended', handleVideoEnded);
          };
        } else {
          // Pause other videos
          videoRef.current.pause();
        }
      }
    });
  }, [currentSpot]);

  // Save scan result to form and move to next spot when data is available
  useEffect(() => {
    if (data && data.values && !isPending) {
      // Understand which spot we are scanning (rescan or new)
      let isRescan = false;
      let idx: number;
      if (errorState !== null) {
        idx = errorState;
        isRescan = true;
      } else {
        idx = currentSpotRef.current;
      }
      console.log('Scan data received for spot', idx + 1, data);

      // Validate color data
      if (!validateColorData(data)) {
        console.warn(
          'Scanned color data is out of valid skin color range:',
          data,
        );
        setErrorState(idx);
        setIsRescanModalOpen(true);
        return;
      }
      // Clear error state on valid data
      if (errorState === idx) {
        setErrorState(null);
      }

      // Show success checkmark
      setShowSuccess(true);

      // Save data to form after a brief delay to show the checkmark
      setTimeout(() => {
        methods.setValue(
          `answers[${questionnaireIndex}].value[${idx}]` as any,
          data.values,
        );
        if (!isRescan) {
          // Move to next spot after data is saved
          const nextSpot = Math.min(idx + 1, numberOfSpots);
          if (nextSpot !== idx) {
            console.log('Moving to next spot', nextSpot + 1);
            changeSpot(nextSpot);
            setShowSuccess(false); // Hide checkmark when moving to next spot
          } else {
            // Last spot, hide checkmark after delay
            setTimeout(() => setShowSuccess(false), 1000);
          }
        }
      }, 1500); // Show checkmark for 1.5 seconds
    }
    // IMPORTANT: do not include currentSpot in deps to avoid looping on spot change with same data
  }, [data, isPending, methods, questionnaireIndex, errorState]);

  function handleSpotScanned() {
    const DELAY_MS = 2500; // Delay before triggering scan
    setIsScanDelay(true);
    console.log('Triggering scan for spot', currentSpot + 1);
    window.setTimeout(() => {
      trigger();
      setIsScanDelay(false);
    }, DELAY_MS);
  }

  function displayButton() {
    if (currentSpot < numberOfSpots || errorState !== null) {
      return (
        <DefaultButton
          text={t('sensorAnalysis.scanButton')}
          handleClick={() => handleSpotScanned()}
          disabled={isPending || isScanDelay || isVideoRunning}
          focus={allSpotsScanned}
        />
      );
    }
    //check spots
    // const [allValid, invalidIdx] = validateAllSpotsScanned();
    // if (!allValid) {
    //   console.warn('Invalid spot detected at index', invalidIdx);
    //   console.log('Results are:', methods.getValues());
    //   setErrorState(invalidIdx);
    //   setIsRescanModalOpen(true);
    //   return (
    //     <DefaultButton
    //       text={t('sensorAnalysis.scanButton')}
    //       handleClick={() => handleSpotScanned()}
    //       disabled={isPending}
    //       focus={allSpotsScanned}
    //     />
    //   );
    // }
    return (
      console.log(
        'All spots scanned, showing Next Page button. Results are:',
        methods.getValues(),
      ),
      (
        <DefaultButton
          text={t('common.nextPage')}
          handleClick={() => handleClick(QuestinnairePages.QuestionScreen)}
          focus={true}
        />
      )
    );
  }

  // Render all videos, but only show the current one
  function renderVideos() {
    return (
      <>
        <video
          ref={foreheadVideoRef}
          src="/scan_skin_position_forehead.mp4"
          className="w-full rounded-3xl object-cover shadow-lg h-full"
          style={{ display: currentSpot === 0 ? 'block' : 'none' }}
          muted
          preload="auto"
        />
        <video
          ref={cheekVideoRef}
          src="/scan_skin_cheek.mp4"
          className="w-full rounded-3xl object-cover shadow-lg h-full"
          style={{ display: currentSpot === 1 ? 'block' : 'none' }}
          muted
          preload="auto"
        />
        <video
          ref={neckVideoRef}
          src="/scan_skin_neck.mp4"
          className="w-full rounded-3xl object-cover shadow-lg h-full"
          style={{ display: currentSpot === 2 ? 'block' : 'none' }}
          muted
          preload="auto"
        />
        <video
          ref={homeVideoRef}
          src="/scan_skin_home.mp4"
          className="w-full rounded-3xl object-cover shadow-lg h-full"
          style={{ display: currentSpot === 3 ? 'block' : 'none' }}
          muted
          preload="auto"
        />
      </>
    );
  }

  // function validateAllSpotsScanned(): [boolean, number] {
  //   const maxDistanceAllowed = 3;
  //   // Check if all scanned spots are valid and consistent
  //   const formData = methods.watch();
  //   const spotValues = formData.answers?.[questionnaireIndex]?.value || [];
  //   const sums = [0.0, 0.0, 0.0];
  //   for (const val of spotValues) {
  //     if (!Array.isArray(val)) {
  //       const idx = spotValues.indexOf(val);
  //       return [false, idx];
  //     }
  //     sums[0] += val[0];
  //     sums[1] += val[1];
  //     sums[2] += val[2];
  //   }
  //   const avg = sums.map((s) => s / spotValues.length);
  //   // Check if average is in valid skin color range
  //   // Find the furtherest spot from avg
  //   let maxDist = 0;
  //   let farIdx = -1;
  //   for (let i = 0; i < spotValues.length; i++) {
  //     const val = spotValues[i];
  //     const dist = Math.sqrt(
  //       Math.pow(val[0] - avg[0], 2) +
  //         Math.pow(val[1] - avg[1], 2) +
  //         Math.pow(val[2] - avg[2], 2),
  //     );
  //     if (dist > maxDist) {
  //       maxDist = dist;
  //       farIdx = i;
  //     }
  //   }
  //   if (maxDist > maxDistanceAllowed) {
  //     return [false, farIdx];
  //   }
  //   return [true, 0];
  // }
  // Check if all 3 spots are scanned
  const formData = methods.watch();
  const spotValues = formData.answers?.[questionnaireIndex]?.value || [];
  const allSpotsScanned =
    spotValues.length >= numberOfSpots &&
    spotValues[0] &&
    spotValues[1] &&
    spotValues[2];

  const spots = [
    { label: t('sensorAnalysis.item1'), key: 'item1' },
    { label: t('sensorAnalysis.item2'), key: 'item2' },
    { label: t('sensorAnalysis.item3'), key: 'item3' },
  ];

  return (
    <main className="flex flex-col items-center justify-center">
      <RescanPopupModal
        open={isRescanModalOpen}
        onClose={() => setIsRescanModalOpen(false)}
      />
      {/* Title */}
      <QuestionnaireTitle
        title={t('sensorAnalysis.title')}
        // subtitle={t('sensorAnalysis.instruction')}
      />
      <div className="w-full mb-8 ">
        <ScanProgress
          items={spots}
          currentStep={currentSpot}
          errorIndex={errorState}
        />
      </div>
      <div className="flex flex-row items-center justify-evenly h-full mb-12">
        {/* Image */}
        <div className="w-full flex justify-center h-full">
          <div className="relative rounded-3xl overflow-hidden h-full">
            {renderVideos()}

            {/* Keep holding overlay when scanning */}
            {isPending && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
              >
                <div className="relative">
                  {/* Spinning circle animation */}
                  <div className="w-20 h-20 border-4 border-black border-t-transparent rounded-full animate-spin mb-6"></div>
                </div>
                <Typography variant="h4" fontWeight={600}>
                  {t('sensorAnalysis.keepHolding', 'Keep holding')}
                </Typography>
              </div>
            )}

            {/* Success checkmark overlay */}
            {showSuccess && !isPending && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
              >
                <div className="relative">
                  {/* Green checkmark */}
                  <CheckIcon
                    style={{
                      fontSize: '200',
                      color: theme.palette.success.main,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Instructions */}
      <div className="p-14 gap-8 flex flex-col w-full">
        <div className="flex flex-row gap-4">
          <IconFace color={theme.palette.primary.light} />
          <Typography
            variant="h4"
            fontWeight={500}
            color="text.primary"
            align="left"
          >
            {t('sensorAnalysis.instruction1')}
          </Typography>
        </div>
        <div className="flex flex-row gap-4">
          <IconTarget color={theme.palette.primary.main} />
          <Typography
            variant="h4"
            fontWeight={500}
            color="text.primary"
            align="left"
          >
            {t('sensorAnalysis.instruction2')}
          </Typography>
        </div>
        <div className="flex flex-row gap-4">
          <IconCheck color={theme.palette.primary.dark} />
          <Typography
            variant="h4"
            fontWeight={500}
            color="text.primary"
            align="left"
          >
            {t('sensorAnalysis.instruction3')}
          </Typography>
        </div>
      </div>
      {displayButton()}
    </main>
  );
}

// Outer component that provides the context
export function SensorAnalysisSteps({
  questionnaireIndex,
  handleClick,
}: SensorAnalysisProps) {
  return (
    <ColorSensorProvider>
      <SensorAnalysisContent
        questionnaireIndex={questionnaireIndex}
        handleClick={handleClick}
      />
    </ColorSensorProvider>
  );
}

export default SensorAnalysisSteps;
