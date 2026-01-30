import { useCallback, useEffect, useRef, useState } from 'react';

import { faceLandmarkerService } from '../services/face-landmarker-service';

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceDetectionResult {
  landmarks: FaceLandmark[];
  isLookingAtCamera: boolean;
  confidence: number;
}

export interface UseFaceDetectionOptions {
  onFaceDetected?: (result: FaceDetectionResult) => void;
  onPhotoTaken?: (imageData: string, landmarks: FaceLandmark[]) => void;
  detectionThreshold?: number;
}

// Global camera lock to prevent multiple instances from accessing camera
const cameraLock: {
  isLocked: boolean;
  userId: string | null;
  stream: MediaStream | null;
} = {
  isLocked: false,
  userId: null,
  stream: null,
};

export function useFaceDetection({
  onFaceDetected,
  onPhotoTaken,
  detectionThreshold = 0.99,
}: UseFaceDetectionOptions = {}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [lastDetectionResult, setLastDetectionResult] =
    useState<FaceDetectionResult | null>(null);

  // Auto countdown states
  const [autoCountdownEnabled, setAutoCountdownEnabled] = useState(true);
  const [lookingAtCameraTime, setLookingAtCameraTime] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);

  const faceLandmarkerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const userIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  const detectionCountRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(0);
  const lastDetectionResultRef = useRef<FaceDetectionResult | null>(null);

  // Debug logging
  const log = useCallback((message: string, ...args: any[]) => {
    console.log(
      `[FaceDetection Hook ${userIdRef.current}] ${message}`,
      ...args,
    );
  }, []);

  const releaseCameraLock = useCallback(() => {
    const userId = userIdRef.current;
    if (cameraLock.userId === userId) {
      log('Releasing camera lock', { userId });

      // Stop any existing stream
      if (cameraLock.stream) {
        cameraLock.stream.getTracks().forEach((track) => track.stop());
        cameraLock.stream = null;
      }

      cameraLock.isLocked = false;
      cameraLock.userId = null;
    }
  }, [log]);

  const acquireCameraLock = useCallback((): boolean => {
    const userId = userIdRef.current;
    log('Attempting to acquire camera lock...', {
      userId,
      currentLock: cameraLock,
    });

    if (!cameraLock.isLocked || cameraLock.userId === userId) {
      cameraLock.isLocked = true;
      cameraLock.userId = userId;
      log('Camera lock acquired', { userId });
      return true;
    }

    log('Camera lock failed - already in use by', cameraLock.userId);
    return false;
  }, [log]);

  const initializeCamera = useCallback(async (): Promise<MediaStream> => {
    log('Initializing camera...');

    if (!acquireCameraLock()) {
      throw new Error('Camera is already in use by another instance');
    }

    try {
      // Reuse existing stream if available
      if (cameraLock.stream && cameraLock.stream.active) {
        log('Reusing existing camera stream');
        return cameraLock.stream;
      }

      // Request new camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      cameraLock.stream = stream;
      streamRef.current = stream;
      log('Camera initialized successfully');
      return stream;
    } catch (err) {
      log('Camera initialization failed:', err);
      releaseCameraLock();
      throw err;
    }
  }, [log, acquireCameraLock, releaseCameraLock]);

  const calculateConfidence = useCallback((landmarks: any[]): number => {
    // Simple confidence calculation based on landmark presence and positions
    if (!landmarks || landmarks.length === 0) return 0;

    // Check if key facial landmarks are present and well-positioned
    const requiredLandmarks = [
      1,
      2,
      3,
      4,
      5, // Face outline
      33,
      133,
      362,
      263, // Eyes
      19,
      94,
      168,
      175, // Nose
      61,
      84,
      17,
      314,
      405,
      320,
      308,
      324,
      318, // Mouth
    ];

    const presentLandmarks = requiredLandmarks.filter(
      (idx) =>
        landmarks[idx] &&
        landmarks[idx].x >= 0 &&
        landmarks[idx].x <= 1 &&
        landmarks[idx].y >= 0 &&
        landmarks[idx].y <= 1,
    );

    return presentLandmarks.length / requiredLandmarks.length;
  }, []);

  const checkLookingAtCamera = useCallback(
    (landmarks: any[]): boolean => {
      if (!landmarks || landmarks.length < 468) return false;

      try {
        const noseTip = landmarks[1]; // Nose tip
        const leftEye = landmarks[33]; // Left eye outer corner
        const rightEye = landmarks[263]; // Right eye outer corner
        const leftMouth = landmarks[61]; // Left mouth corner
        const rightMouth = landmarks[291]; // Right mouth corner

        if (!noseTip || !leftEye || !rightEye || !leftMouth || !rightMouth)
          return false;

        // Calculate distances for symmetry check
        const leftDistance = Math.sqrt(
          Math.pow(noseTip.x - leftEye.x, 2) +
            Math.pow(noseTip.y - leftEye.y, 2) +
            Math.pow(noseTip.z - leftEye.z, 2),
        );

        const rightDistance = Math.sqrt(
          Math.pow(noseTip.x - rightEye.x, 2) +
            Math.pow(noseTip.y - rightEye.y, 2) +
            Math.pow(noseTip.z - rightEye.z, 2),
        );

        // Calculate symmetry ratio (closer to 1 means more frontal)
        const symmetryRatio =
          Math.min(leftDistance, rightDistance) /
          Math.max(leftDistance, rightDistance);

        // Check if nose is centered between eyes
        const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        const noseOffset = Math.abs(noseTip.x - eyeCenterX);
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        const noseOffsetRatio = noseOffset / eyeDistance;

        // Check mouth symmetry
        const mouthCenterX = (leftMouth.x + rightMouth.x) / 2;
        const mouthOffset = Math.abs(mouthCenterX - eyeCenterX);
        const mouthOffsetRatio = mouthOffset / eyeDistance;

        // Calculate confidence based on symmetry and alignment
        const confidence_dir =
          symmetryRatio * 0.4 +
          (1 - noseOffsetRatio) * 0.3 +
          (1 - mouthOffsetRatio) * 0.3;

        const isLookingAtCamera = confidence_dir > detectionThreshold;
        console.log(
          `[Face Detection] Direction Confidence: ${confidence_dir.toFixed(3)}, Looking at Camera: ${isLookingAtCamera}, Detection Threshold: ${detectionThreshold}`,
        );

        return isLookingAtCamera;
      } catch {
        return false;
      }
    },
    [detectionThreshold],
  );

  const detectFaces = useCallback(
    (forceStart = false) => {
      const now = Date.now();
      detectionCountRef.current++;
      const timeSinceLastDetection = now - lastDetectionTimeRef.current;
      lastDetectionTimeRef.current = now;

      log('detectFaces: Called', {
        count: detectionCountRef.current,
        timeSince: timeSinceLastDetection,
        mounted: mountedRef.current,
        streamActive: isStreamActive,
        hasVideo: !!videoRef.current,
        hasFaceLandmarker: !!faceLandmarkerRef.current,
        forceStart,
      });

      if (
        !mountedRef.current ||
        (!isStreamActive && !forceStart) ||
        !videoRef.current ||
        !faceLandmarkerRef.current
      ) {
        log('detectFaces: Missing requirements', {
          mounted: mountedRef.current,
          streamActive: isStreamActive,
          hasVideo: !!videoRef.current,
          hasFaceLandmarker: !!faceLandmarkerRef.current,
          forceStart,
        });

        // Still schedule next frame if we're just starting
        if (forceStart && mountedRef.current) {
          log('detectFaces: Retrying in next frame due to forceStart');
          animationFrameRef.current = requestAnimationFrame(() =>
            detectFaces(true),
          );
        }
        return;
      }

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        log('detectFaces: Starting detection', {
          videoReady: video.readyState >= 2,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        });

        let results;
        try {
          // Try the correct MediaPipe method name
          if (typeof faceLandmarkerRef.current.detectForVideo === 'function') {
            results = faceLandmarkerRef.current.detectForVideo(
              video,
              Date.now(),
            );
          } else if (typeof faceLandmarkerRef.current.detect === 'function') {
            results = faceLandmarkerRef.current.detect(video, Date.now());
          } else {
            log(
              'Available methods:',
              Object.getOwnPropertyNames(faceLandmarkerRef.current),
            );
            throw new Error(
              'No valid detection method found on face landmarker',
            );
          }
        } catch (methodError) {
          log('Method call error:', methodError);
          throw methodError;
        }

        log('detectFaces: Detection results', {
          hasFaceLandmarks: !!results.faceLandmarks,
          faceLandmarksLength: results.faceLandmarks?.length || 0,
          fullResults: results,
        });

        // Clear previous drawings
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Get the actual display size of the video element
            const displayWidth = video.clientWidth;
            const displayHeight = video.clientHeight;

            // Set canvas size to match the displayed video size
            canvas.width = displayWidth;
            canvas.height = displayHeight;

            // Clear the canvas FIRST
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            log('detectFaces: Canvas cleared', {
              width: canvas.width,
              height: canvas.height,
            });
          }
        }

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          log('detectFaces: Processing landmarks', {
            landmarkCount: landmarks.length,
          });

          // Calculate confidence and looking at camera
          const confidence = calculateConfidence(landmarks);
          const isLookingAtCamera = checkLookingAtCamera(landmarks);

          log('detectFaces: Calculated metrics', {
            confidence,
            isLookingAtCamera,
          });

          const detectionResult: FaceDetectionResult = {
            landmarks: landmarks.map((landmark: any) => ({
              x: landmark.x,
              y: landmark.y,
              z: landmark.z || 0,
            })),
            isLookingAtCamera,
            confidence,
          };

          setLastDetectionResult(detectionResult);
          lastDetectionResultRef.current = detectionResult;

          // Draw landmarks on canvas overlay
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Get the actual display size of the video element
              const videoElement = video;
              const displayWidth = videoElement.clientWidth;
              const displayHeight = videoElement.clientHeight;

              // Set canvas size to match the displayed video size (not the actual video resolution)
              canvas.width = displayWidth;
              canvas.height = displayHeight;

              // Clear previous drawings
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Calculate the scaling and cropping for object-cover
              const videoAspectRatio = video.videoWidth / video.videoHeight;
              const displayAspectRatio = displayWidth / displayHeight;

              let scaleX: number,
                scaleY: number,
                offsetX = 0,
                offsetY = 0;

              if (videoAspectRatio > displayAspectRatio) {
                // Video is wider - crop horizontally (our case with 2:3 container)
                scaleY = displayHeight / video.videoHeight;
                scaleX = scaleY;
                offsetX = (video.videoWidth * scaleX - displayWidth) / 2;
              } else {
                // Video is taller - crop vertically
                scaleX = displayWidth / video.videoWidth;
                scaleY = scaleX;
                offsetY = (video.videoHeight * scaleY - displayHeight) / 2;
              }

              log('detectFaces: Drawing landmarks on canvas');

              // Set colors based on looking at camera
              ctx.fillStyle = isLookingAtCamera ? '#00ff00' : '#ffff00';
              ctx.strokeStyle = isLookingAtCamera ? '#00ff00' : '#ffff00';
              ctx.lineWidth = 1;

              // Draw ALL 468 face landmarks for real-time tracking
              landmarks.forEach((landmark: any) => {
                if (
                  landmark &&
                  landmark.x >= 0 &&
                  landmark.x <= 1 &&
                  landmark.y >= 0 &&
                  landmark.y <= 1
                ) {
                  // Convert normalized coordinates to video coordinates, then to display coordinates
                  const videoX = landmark.x * video.videoWidth;
                  const videoY = landmark.y * video.videoHeight;

                  // Apply scaling and offset for object-cover cropping
                  const x = videoX * scaleX - offsetX;
                  const y = videoY * scaleY - offsetY;

                  // Only draw if the point is visible in the cropped area
                  if (
                    x >= 0 &&
                    x <= canvas.width &&
                    y >= 0 &&
                    y <= canvas.height
                  ) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
                    ctx.fill();
                  }
                }
              });

              // Highlight key landmarks with larger dots
              const keyPoints = [
                1,
                33,
                362,
                263,
                133, // Face center and eyes
                19,
                94,
                168,
                175, // Nose
                61,
                84,
                17,
                314,
                405,
                320,
                308,
                324,
                318, // Mouth
              ];

              ctx.fillStyle = isLookingAtCamera ? '#00aa00' : '#aaaa00';
              keyPoints.forEach((idx) => {
                if (landmarks[idx]) {
                  // Convert normalized coordinates to video coordinates, then to display coordinates
                  const videoX = landmarks[idx].x * video.videoWidth;
                  const videoY = landmarks[idx].y * video.videoHeight;

                  // Apply scaling and offset for object-cover cropping
                  const x = videoX * scaleX - offsetX;
                  const y = videoY * scaleY - offsetY;

                  // Only draw if the point is visible in the cropped area
                  if (
                    x >= 0 &&
                    x <= canvas.width &&
                    y >= 0 &&
                    y <= canvas.height
                  ) {
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                  }
                }
              });

              log('detectFaces: All landmarks drawn successfully');
            }
          }

          if (confidence >= detectionThreshold && onFaceDetected) {
            onFaceDetected(detectionResult);
          }
        } else {
          log('detectFaces: No face landmarks detected');
          setLastDetectionResult(null);
          lastDetectionResultRef.current = null;
        }
      } catch (err) {
        log('Detection error:', err);
      }

      // ALWAYS continue detection loop when stream is active
      if (mountedRef.current && isStreamActive) {
        log('detectFaces: Scheduling next frame (continuous mode)');
        animationFrameRef.current = requestAnimationFrame(() => detectFaces());
      } else if (mountedRef.current && forceStart) {
        log('detectFaces: Scheduling next frame (force start mode)');
        animationFrameRef.current = requestAnimationFrame(() =>
          detectFaces(true),
        );
      } else {
        log('detectFaces: Loop stopped', {
          mounted: mountedRef.current,
          isStreamActive,
          forceStart,
        });
      }
    },
    [
      isStreamActive,
      detectionThreshold,
      onFaceDetected,
      log,
      calculateConfidence,
      checkLookingAtCamera,
    ],
  );

  const stopDetection = useCallback(() => {
    log('Stopping face detection...');

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Stop video
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    // Release camera lock
    releaseCameraLock();

    streamRef.current = null;
    setIsStreamActive(false);
    setCountdown(null);
    setLastDetectionResult(null);
    lastDetectionResultRef.current = null;
    log('Face detection stopped');
  }, [log, releaseCameraLock]);

  const startDetection = useCallback(async () => {
    if (!isInitialized) {
      log('Cannot start detection - service not initialized');
      setError('Face detection service not initialized');
      return;
    }

    if (isStreamActive) {
      log('Detection already active');
      return;
    }

    try {
      log('Starting face detection...');
      setIsLoading(true);
      setError(null);

      // Get MediaPipe instance from service
      const faceLandmarker = await faceLandmarkerService.getFaceLandmarker();
      if (!faceLandmarker) {
        throw new Error('Face landmarker not available');
      }

      log(
        'MediaPipe instance methods:',
        Object.getOwnPropertyNames(faceLandmarker),
      );
      log(
        'MediaPipe instance prototype:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(faceLandmarker)),
      );

      faceLandmarkerRef.current = faceLandmarker;

      // Initialize camera
      const stream = await initializeCamera();

      // Setup video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }

          const onLoadedMetadata = () => {
            videoRef.current?.removeEventListener(
              'loadedmetadata',
              onLoadedMetadata,
            );
            resolve();
          };

          videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
          videoRef.current.play().catch(reject);
        });
      }

      if (mountedRef.current) {
        setIsStreamActive(true);
        setIsLoading(false);
        log('Face detection started successfully');

        // Start detection loop with force start to bypass initial state check
        // Also use setTimeout to ensure state has been updated
        setTimeout(() => {
          if (mountedRef.current) {
            log('Starting detection loop after state update');
            detectFaces(true);
          }
        }, 50);
      }
    } catch (err) {
      log('Failed to start detection:', err);
      releaseCameraLock();
      if (mountedRef.current) {
        setError(
          err instanceof Error ? err.message : 'Failed to start face detection',
        );
        setIsLoading(false);
      }
    }
  }, [
    isInitialized,
    isStreamActive,
    initializeCamera,
    log,
    releaseCameraLock,
    detectFaces,
  ]);

  const takePhoto = useCallback(async (): Promise<void> => {
    // Use the most recent detection result from the ref, not the stale state
    const currentDetectionResult = lastDetectionResultRef.current;

    if (!videoRef.current || !canvasRef.current || !currentDetectionResult) {
      log('Cannot take photo - missing requirements', {
        hasVideo: !!videoRef.current,
        hasCanvas: !!canvasRef.current,
        hasDetectionResult: !!currentDetectionResult,
      });
      setError('Cannot take photo: camera not ready or no face detected');
      return;
    }

    try {
      log('Taking photo with current detection result...', {
        landmarkCount: currentDetectionResult.landmarks.length,
        isLookingAtCamera: currentDetectionResult.isLookingAtCamera,
        confidence: currentDetectionResult.confidence,
      });

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Get the actual display size of the video element
      const displayWidth = video.clientWidth;
      const displayHeight = video.clientHeight;

      // Set canvas size to match the displayed video size (cropped view)
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Calculate the scaling and cropping for object-cover
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      const displayAspectRatio = displayWidth / displayHeight;

      let scaleX: number,
        scaleY: number,
        sourceX = 0,
        sourceY = 0,
        sourceWidth = video.videoWidth,
        sourceHeight = video.videoHeight;

      if (videoAspectRatio > displayAspectRatio) {
        // Video is wider - crop horizontally to fit display
        scaleY = displayHeight / video.videoHeight;
        scaleX = scaleY;
        sourceWidth = displayWidth / scaleX;
        sourceX = (video.videoWidth - sourceWidth) / 2;
      } else {
        // Video is taller - crop vertically to fit display
        scaleX = displayWidth / video.videoWidth;
        scaleY = scaleX;
        sourceHeight = displayHeight / scaleY;
        sourceY = (video.videoHeight - sourceHeight) / 2;
      }

      // Draw the cropped video frame to canvas
      ctx.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight, // Source rectangle (cropped from video)
        0,
        0,
        displayWidth,
        displayHeight, // Destination rectangle (full canvas)
      );

      // Draw landmarks on the captured photo using the CURRENT detection result
      if (
        currentDetectionResult.landmarks &&
        currentDetectionResult.landmarks.length > 0
      ) {
        log('Drawing current landmarks on captured photo');

        // Set colors based on looking at camera (current state)
        ctx.fillStyle = currentDetectionResult.isLookingAtCamera
          ? '#00ff00'
          : '#ffff00';
        ctx.strokeStyle = currentDetectionResult.isLookingAtCamera
          ? '#00ff00'
          : '#ffff00';
        ctx.lineWidth = 2;

        // Draw ALL face landmarks on the photo using current positions with coordinate transformation
        currentDetectionResult.landmarks.forEach((landmark) => {
          if (
            landmark &&
            landmark.x >= 0 &&
            landmark.x <= 1 &&
            landmark.y >= 0 &&
            landmark.y <= 1
          ) {
            // Convert normalized coordinates to video coordinates, then to display coordinates
            const videoX = landmark.x * video.videoWidth;
            const videoY = landmark.y * video.videoHeight;

            // Apply the same transformation used for cropping
            const x = (videoX - sourceX) * scaleX;
            const y = (videoY - sourceY) * scaleY;

            // Only draw if the point is visible in the cropped area
            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        });

        // Highlight key landmarks with larger dots
        const keyLandmarkIndices = [
          1,
          33,
          362,
          263,
          133, // Face center and eyes
          19,
          94,
          168,
          175, // Nose
          61,
          84,
          17,
          314,
          405,
          320,
          308,
          324,
          318, // Mouth
        ];

        ctx.fillStyle = currentDetectionResult.isLookingAtCamera
          ? '#00aa00'
          : '#aaaa00';
        keyLandmarkIndices.forEach((idx) => {
          if (currentDetectionResult.landmarks[idx]) {
            const landmark = currentDetectionResult.landmarks[idx];

            // Convert normalized coordinates to video coordinates, then to display coordinates
            const videoX = landmark.x * video.videoWidth;
            const videoY = landmark.y * video.videoHeight;

            // Apply the same transformation used for cropping
            const x = (videoX - sourceX) * scaleX;
            const y = (videoY - sourceY) * scaleY;

            // Only draw if the point is visible in the cropped area
            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        });

        log('Landmarks drawn on captured photo successfully');
      }

      // Get image data with landmarks
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      if (onPhotoTaken) {
        onPhotoTaken(imageData, currentDetectionResult.landmarks);
      }

      log('Photo taken successfully');
    } catch (err) {
      log('Photo capture failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to capture photo');
    }
  }, [onPhotoTaken, log]);

  const startCountdown = useCallback(
    (seconds: number = 3): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!lastDetectionResultRef.current) {
          reject(new Error('No face detected'));
          return;
        }

        log(`Starting ${seconds}s countdown`);
        setCountdown(seconds);
        setCountdownActive(true);

        let currentCount = seconds;
        countdownIntervalRef.current = setInterval(() => {
          // Check if user is still looking at camera using the latest detection result
          if (!lastDetectionResultRef.current?.isLookingAtCamera) {
            log(
              'User looked away during countdown - stopping countdown immediately',
            );
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setCountdown(null);
            setCountdownActive(false);
            setLookingAtCameraTime(0);
            // Re-enable auto countdown after a brief delay
            setTimeout(() => {
              setAutoCountdownEnabled(true);
            }, 500);
            reject(new Error('User looked away during countdown'));
            return;
          }

          currentCount--;
          setCountdown(currentCount);

          if (currentCount <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setCountdown(null);
            setCountdownActive(false);

            // Take photo after countdown with current detection result
            log(
              'Countdown finished - taking photo with latest detection result',
            );
            takePhoto()
              .then(() => resolve())
              .catch(reject);
          }
        }, 700);
      });
    },
    [takePhoto, log],
  );

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setCountdownActive(false);
    setLookingAtCameraTime(0);
    log('Countdown stopped - user looked away');
  }, [log]);

  // Auto countdown when looking at camera
  useEffect(() => {
    if (!autoCountdownEnabled || !isStreamActive) return;

    if (lastDetectionResult?.isLookingAtCamera) {
      const newTime = lookingAtCameraTime + 1;
      setLookingAtCameraTime(newTime);

      // Start countdown after looking at camera for 1 second (about 30 frames at 30fps)
      if (newTime >= 30 && countdown === null && !countdownActive) {
        log('User looking at camera - starting auto countdown');
        setAutoCountdownEnabled(false); // Prevent multiple countdowns
        startCountdown(3).catch((err) => {
          log('Auto countdown failed:', err);
          setAutoCountdownEnabled(true); // Re-enable if failed
        });
      }
    } else {
      // User is not looking at camera - stop countdown if active
      if (countdownActive && countdown !== null) {
        // User looked away during countdown - stop it
        log('User looked away during countdown - stopping');
        stopCountdown();
        // Re-enable auto countdown immediately when they look away
        setTimeout(() => {
          setAutoCountdownEnabled(true);
        }, 500);
      } else {
        // Reset timer if not looking at camera and no countdown is active
        setLookingAtCameraTime(0);
      }
    }
  }, [
    lastDetectionResult,
    autoCountdownEnabled,
    countdown,
    countdownActive,
    lookingAtCameraTime,
    isStreamActive,
    log,
    startCountdown,
    stopCountdown,
  ]);

  // Re-enable auto countdown after photo is taken (when countdown resets to null)
  useEffect(() => {
    if (countdown === null && !autoCountdownEnabled) {
      // Re-enable auto countdown after 2 seconds
      const timeout = setTimeout(() => {
        setAutoCountdownEnabled(true);
        setLookingAtCameraTime(0);
        log('Auto countdown re-enabled');
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [countdown, autoCountdownEnabled, log]);

  // Initialize MediaPipe and sync with service state
  useEffect(() => {
    mountedRef.current = true;
    log('Hook mounted, initializing...');

    const initializeService = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if service is already ready
        if (faceLandmarkerService.isReady()) {
          log('Service already ready');
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }

        // Initialize the service
        log('Initializing service...');
        await faceLandmarkerService.getFaceLandmarker();

        if (mountedRef.current) {
          log('Service initialized successfully');
          setIsInitialized(true);
          setIsLoading(false);
        }
      } catch (err) {
        log('Service initialization failed:', err);
        if (mountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to initialize face detection',
          );
          setIsLoading(false);
        }
      }
    };

    // Listen for service initialization events
    const unsubscribe = faceLandmarkerService.onInitialized(() => {
      log('Received service initialization event');
      if (mountedRef.current) {
        setIsInitialized(true);
        setIsLoading(false);
      }
    });

    initializeService();

    return () => {
      log('Hook unmounting...');
      mountedRef.current = false;
      unsubscribe();
    };
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
      releaseCameraLock();
    };
  }, [stopDetection, releaseCameraLock]);

  // Debug methods
  const getDebugInfo = useCallback(() => {
    return {
      userId: userIdRef.current,
      isInitialized,
      isLoading,
      isStreamActive,
      error,
      countdown,
      lastDetectionResult: lastDetectionResult
        ? {
            confidence: lastDetectionResult.confidence,
            isLookingAtCamera: lastDetectionResult.isLookingAtCamera,
            landmarkCount: lastDetectionResult.landmarks.length,
          }
        : null,
      cameraLock: {
        isLocked: cameraLock.isLocked,
        userId: cameraLock.userId,
        hasStream: !!cameraLock.stream,
        streamActive: cameraLock.stream?.active,
      },
      serviceState: {
        isReady: faceLandmarkerService.isReady(),
      },
    };
  }, [
    isInitialized,
    isLoading,
    isStreamActive,
    error,
    countdown,
    lastDetectionResult,
  ]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    isStreamActive,
    countdown,
    countdownActive,
    lastDetectionResult,
    autoCountdownEnabled,

    // Actions
    startDetection,
    stopDetection,
    takePhoto,
    startCountdown,
    stopCountdown,
    setAutoCountdownEnabled,

    // Refs for video and canvas
    videoRef,
    canvasRef,

    // Debug
    getDebugInfo,
  };
}
