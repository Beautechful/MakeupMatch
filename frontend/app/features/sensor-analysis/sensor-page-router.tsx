import { useState } from 'react';

import { GrabTheSensor } from '../face-scan-guide/grab-the-sensor';
import { LeaveTheSensor } from '../face-scan-guide/leave-the-sensor';
import { ScanningWarnings } from '../face-scan-guide/scanning-warnings';

import SensorAnalysisSteps from './sensor-analysis-steps';

interface SensorPageRouterProps {
  questionnaireIndex: number;
  handleClick: () => void;
}

export function SensorPageRouter({
  questionnaireIndex,
  handleClick,
}: SensorPageRouterProps) {
  const [pointer, setPointer] = useState(0);
  function incrementPointer() {
    setPointer((prev) => prev + 1);
    return pointer;
  }
  switch (pointer) {
    case 0:
      return <GrabTheSensor onNextButtonClick={incrementPointer} />;
    case 1:
      return <ScanningWarnings onNextButtonClick={incrementPointer} />;
    case 2:
      return (
        <SensorAnalysisSteps
          questionnaireIndex={questionnaireIndex}
          handleClick={incrementPointer}
        />
      );
    case 3:
      return <LeaveTheSensor onNextButtonClick={handleClick} />;
    default:
      setPointer(3); // Ensure pointer stays within valid range
  }
}

export default SensorPageRouter;
