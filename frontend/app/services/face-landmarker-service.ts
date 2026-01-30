// Singleton service to manage MediaPipe Face Landmarker
// This prevents multiple instances being created by React StrictMode

interface FaceLandmarkerWrapper {
  instance: any;
  refCount: number;
}

class FaceLandmarkerService {
  private static _instance: FaceLandmarkerService;
  private faceLandmarker: FaceLandmarkerWrapper | null = null;
  private initializationPromise: Promise<any> | null = null;
  private isInitializing = false;
  private initializationListeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): FaceLandmarkerService {
    if (!FaceLandmarkerService._instance) {
      FaceLandmarkerService._instance = new FaceLandmarkerService();
    }
    return FaceLandmarkerService._instance;
  }

  // Add listener for initialization completion
  onInitialized(callback: () => void): () => void {
    this.initializationListeners.add(callback);

    // If already initialized, call immediately
    if (this.faceLandmarker && !this.isInitializing) {
      callback();
    }

    // Return cleanup function
    return () => {
      this.initializationListeners.delete(callback);
    };
  }

  // Notify all listeners when initialization completes
  private notifyInitializationComplete(): void {
    this.initializationListeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in initialization listener:', error);
      }
    });
  }

  async getFaceLandmarker(): Promise<any> {
    // If we already have an instance, increment ref count and return it
    if (this.faceLandmarker) {
      this.faceLandmarker.refCount++;
      console.log(
        'Reusing existing face landmarker instance, refCount:',
        this.faceLandmarker.refCount,
      );
      return this.faceLandmarker.instance;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      console.log('Waiting for existing initialization to complete...');
      const instance = await this.initializationPromise;
      // Increment ref count for this waiting request
      if (this.faceLandmarker) {
        const wrapper = this.faceLandmarker as FaceLandmarkerWrapper;
        wrapper.refCount++;
        console.log(
          'Initialization complete, incremented refCount:',
          wrapper.refCount,
        );
      }
      return instance;
    }

    // Start new initialization
    console.log('Initializing new face landmarker instance...');
    this.isInitializing = true;

    this.initializationPromise = this.initializeNewInstance();

    try {
      const instance = await this.initializationPromise;
      this.faceLandmarker = {
        instance,
        refCount: 1,
      };
      console.log(
        'Face landmarker initialized successfully, refCount:',
        this.faceLandmarker.refCount,
      );

      // Notify all listeners that initialization is complete
      this.notifyInitializationComplete();

      return instance;
    } catch (error) {
      console.error('Failed to initialize face landmarker:', error);
      this.initializationPromise = null;
      this.isInitializing = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async initializeNewInstance(): Promise<any> {
    try {
      // Dynamic import to avoid SSR issues
      const { FaceLandmarker, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
      );

      console.log('Loading MediaPipe vision fileset...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
      );

      console.log('Creating FaceLandmarker with options...');
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      console.log('FaceLandmarker created successfully');
      return faceLandmarker;
    } catch (error) {
      console.error('Error in initializeNewInstance:', error);
      throw error;
    }
  }

  releaseFaceLandmarker(): void {
    if (!this.faceLandmarker) {
      console.log('No face landmarker instance to release');
      return;
    }

    this.faceLandmarker.refCount--;
    console.log(
      'Released face landmarker reference, refCount:',
      this.faceLandmarker.refCount,
    );

    // Only close the instance when no more references exist
    if (this.faceLandmarker.refCount <= 0) {
      console.log('Closing face landmarker instance (no more references)');
      try {
        this.faceLandmarker.instance.close();
      } catch (error) {
        console.error('Error closing face landmarker:', error);
      }
      this.faceLandmarker = null;
      this.initializationPromise = null;
    }
  }

  // Force cleanup (for development/debugging)
  forceCleanup(): void {
    console.log('Force cleanup of face landmarker service');
    if (this.faceLandmarker) {
      try {
        this.faceLandmarker.instance.close();
      } catch (error) {
        console.error('Error during force cleanup:', error);
      }
      this.faceLandmarker = null;
    }
    this.initializationPromise = null;
    this.isInitializing = false;
  }

  getStatus(): {
    hasInstance: boolean;
    refCount: number;
    isInitializing: boolean;
  } {
    return {
      hasInstance: this.faceLandmarker !== null,
      refCount: this.faceLandmarker?.refCount || 0,
      isInitializing: this.isInitializing,
    };
  }

  // Check if the service is ready to use
  isReady(): boolean {
    return this.faceLandmarker !== null && !this.isInitializing;
  }

  // Debug method to log current state
  logStatus(): void {
    console.log('=== Face Landmarker Service Status ===');
    console.log('Has instance:', this.faceLandmarker !== null);
    console.log('Is initializing:', this.isInitializing);
    console.log(
      'Has initialization promise:',
      this.initializationPromise !== null,
    );
    if (this.faceLandmarker) {
      console.log('Ref count:', this.faceLandmarker.refCount);
      console.log('Instance type:', typeof this.faceLandmarker.instance);
    }
    console.log('=====================================');
  }
}

export const faceLandmarkerService = FaceLandmarkerService.getInstance();
