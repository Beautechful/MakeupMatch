import { ProgressCircle } from './progress-circle';

interface ProgressBarProps {
  steps: number;
  currentStep: number;
}

export function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  const progressCircles = [];

  for (let i = 0; i < steps; i++) {
    let state: 'visited' | 'active' | 'not-visited';

    if (i < currentStep) {
      state = 'visited';
    } else if (i === currentStep) {
      state = 'active';
    } else {
      state = 'not-visited';
    }

    progressCircles.push(<ProgressCircle state={state} />);
  }

  return <div className="flex items-center gap-4">{progressCircles}</div>;
}
