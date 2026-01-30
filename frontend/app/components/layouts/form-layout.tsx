import { ProgressBar } from '../ui/progress-bar';

interface FormLayoutProps {
  children: React.ReactNode;
  steps: number;
  currentStep: number;
}

export function FormLayout({ children, steps, currentStep }: FormLayoutProps) {
  return (
    <div className="flex flex-col items-center justify-start w-full">
      <div className="flex justify-center w-full mt-24 mb-4">
        <ProgressBar steps={steps} currentStep={currentStep} />
      </div>
      <div className="flex flex-col items-center justify-center flex-grow w-full h-full">
        {children}
      </div>
    </div>
  );
}
