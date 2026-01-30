import { Typography } from '@mui/material';
import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useFaceDetection,
  type FaceLandmark,
} from '../../hooks/use-face-detection';
import { QuestionnaireTitle } from '../ui/questionnaire-title';

interface FaceDetectionComponentProps {
  onPhotoTaken: (imageData: string, landmarks: FaceLandmark[]) => void;
  onError?: (error: string) => void;
}

export function FaceDetectionComponent({
  onPhotoTaken,
  onError,
}: FaceDetectionComponentProps) {
  const { t } = useTranslation();

  const {
    isInitialized,
    isLoading,
    error,
    countdown,
    isStreamActive,
    lastDetectionResult,
    autoCountdownEnabled,
    videoRef,
    canvasRef,
    startDetection,
  } = useFaceDetection({
    onPhotoTaken: (imageData: string, landmarks: FaceLandmark[]) => {
      onPhotoTaken(imageData, landmarks);
    },
    detectionThreshold: 0.96, // Adjust sensitivity as needed
  });

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handleStartDetection = useCallback(async () => {
    try {
      await startDetection();
    } catch {
      // Error handling is done in the hook
    }
  }, [startDetection]);

  // Auto-start camera when initialized
  useEffect(() => {
    if (isInitialized && !isStreamActive && !isLoading) {
      handleStartDetection();
    }
  }, [isInitialized, isStreamActive, isLoading, handleStartDetection]);

  const getStatusMessage = () => {
    if (isLoading) return t('faceDetection.initializing');
    if (error) return t('faceDetection.error');
    if (!isInitialized) return t('faceDetection.notInitialized');
    if (countdown !== null) {
      if (countdown > 0) {
        return t('faceDetection.takingPhotoIn', { seconds: countdown });
      } else {
        return t('faceDetection.takingPhotoNow');
      }
    }
    if (lastDetectionResult) {
      if (lastDetectionResult.isLookingAtCamera) {
        return autoCountdownEnabled
          ? t('faceDetection.lookingAtCameraAuto')
          : t('faceDetection.lookingAtCameraManual');
      } else {
        return t('faceDetection.lookDirectly');
      }
    }
    return t('faceDetection.positionFace');
  };

  const getStatusColor = () => {
    if (error) return 'error';
    if (countdown !== null) return 'warning';
    if (lastDetectionResult?.isLookingAtCamera) return 'success';
    return 'info';
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
      {/* Title */}
      <QuestionnaireTitle title={t('faceDetection.title')} />
      {/* Camera Preview */}
      <div className="relative mb-4 mt-8">
        {/* Portrait container (2/3 aspect ratio) with horizontal cropping */}
        <div
          className="relative overflow-hidden border-2 border-gray-300 rounded-lg bg-gray-100"
          style={{
            width: '66.666vw',
            maxWidth:
              window.innerWidth > window.innerHeight ? '200px' : undefined, // 200px only for landscape screens
            aspectRatio: '2/3', // Portrait orientation
          }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{
              transform: 'scaleX(-1)', // Mirror effect - keep this as it's not available in Tailwind
            }}
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none w-full h-full"
            style={{
              transform: 'scaleX(-1)', // Mirror effect for consistency - keep this as it's not available in Tailwind
            }}
          />
          Loading indicator when camera is starting
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <Typography
                variant="body2"
                className="ml-2"
                color="text.secondary"
              >
                {t('faceDetection.startingCamera')}
              </Typography>
            </div>
          )}
          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg">
              {/* Dark overlay that allows camera footage to show through */}
              <div className="absolute inset-0 bg-black opacity-60 rounded-lg" />

              {/* Countdown number */}
              <Typography
                variant="h1"
                color="white"
                fontWeight="bold"
                className={`relative z-10 text-center ${
                  countdown > 0 ? 'animate-pulse' : ''
                }`}
                sx={{
                  textShadow:
                    '0 0 30px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.5)',
                  fontSize:
                    countdown > 0
                      ? { xs: '4rem', sm: '5rem', md: '6rem' }
                      : { xs: '2.5rem', sm: '3rem', md: '4rem' },
                }}
              >
                {countdown > 0 ? countdown : '📸'}
              </Typography>

              {/* Additional text for context */}
              {countdown > 0 && (
                <Typography
                  variant="h6"
                  color="white"
                  className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center"
                  sx={{
                    textShadow: '0 0 10px rgba(0,0,0,0.8)',
                    fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' },
                  }}
                >
                  {t('faceDetection.keepLooking')}
                </Typography>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {/* <div
        className={`mb-4 w-full max-w-md rounded-lg p-3 flex items-center ${
          getStatusColor() === 'error'
            ? 'bg-red-50 border border-red-200 text-red-700'
            : getStatusColor() === 'warning'
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
              : getStatusColor() === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
        )}
        <Typography variant="body2" className="text-center flex-1">
          {getStatusMessage()}
        </Typography>
      </div> */}

      {/* Control Buttons */}
      <div className="flex gap-4 w-full max-w-md">
        {!isStreamActive ? (
          <div className="flex items-center justify-center w-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <Typography variant="body2" className="ml-2" color="text.secondary">
              {isLoading
                ? t('faceDetection.startingCamera')
                : t('faceDetection.initializing')}
            </Typography>
          </div>
        ) : (
          <>
            {/* Commented out buttons as per user requirement */}
            {/* <DefaultButton
              text={
                autoCountdownEnabled
                  ? t('faceDetection.disableAutoCapture')
                  : t('faceDetection.enableAutoCapture')
              }
              handleClick={() => setAutoCountdownEnabled(!autoCountdownEnabled)}
              style={{ flex: 1 }}
            />
            {countdown !== null ? (
              <DefaultButton
                text={t('faceDetection.cancelCountdown')}
                handleClick={stopCountdown}
                style={{ flex: 1 }}
              />
            ) : (
              <DefaultButton
                text={t('faceDetection.manualCapture')}
                handleClick={handleTakePhoto}
                disabled={
                  !lastDetectionResult?.isLookingAtCamera || countdown !== null
                }
                style={{ flex: 1 }}
              />
            )}
            <DefaultButton
              text={t('faceDetection.stopCamera')}
              handleClick={stopDetection}
              style={{ flex: 1 }}
            /> */}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center max-w-md">
        <Typography variant="body2" color="text.secondary">
          {t('faceDetection.instructions')}
        </Typography>
      </div>
    </div>
  );
}

export default FaceDetectionComponent;
