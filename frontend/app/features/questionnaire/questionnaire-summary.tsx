import { Typography } from '@mui/material';

import { TimeButton } from '~/components/ui/time-button';

interface QuestionnaireSummaryProps {
  onSubmit?: () => void;
}

export function QuestionnaireSummary({ onSubmit }: QuestionnaireSummaryProps) {
  return (
    <main className="flex flex-col items-center justify-center w-full h-full">
      <div className="p-4">
        <Typography
          variant="h4"
          fontWeight={600}
          color="text.primary"
          align="center"
        >
          Thank you for completing the questionnaire!
        </Typography>
      </div>
      {onSubmit && (
        <TimeButton
          text="Submit"
          handleClick={onSubmit}
          autoPress={true}
          size="xlarge"
          timeDelay={1} // imediately submit
        />
      )}
    </main>
  );
}

export default QuestionnaireSummary;
