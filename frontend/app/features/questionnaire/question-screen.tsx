import { Typography } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { DefaultButton } from 'app/components/ui/default-button';
import { Field } from '~/components/react-hook-form';
import { QuestionnaireTitle } from '~/components/ui/questionnaire-title';

interface QuestionnaireProps {
  questionnaireIndex: number;
  question: string;
  options: Record<string, string>;
  handleSubmit: () => void;
}

export function QuestionScreen({
  questionnaireIndex,
  question,
  options,
  handleSubmit,
}: QuestionnaireProps) {
  const { t } = useTranslation();
  // Watch for changes in the current question's answer
  const answers = useWatch({
    name: `answers`,
  });
  const selectedValue = answers?.[questionnaireIndex]?.value;
  // Button is enabled when a chip is selected (selectedValue is not undefined)
  const isButtonDisabled =
    selectedValue === null || selectedValue === undefined;
  return (
    <main className="flex flex-col items-center justify-center bg-white w-full h-full">
      {/* Title */}
      <QuestionnaireTitle title={t('question.title')} />
      <div className="p-4 pt-24">
        <Typography
          variant="h2"
          fontWeight={600}
          color="text.primary"
          align="center"
        >
          {question}
        </Typography>
      </div>
      {/* Options */}
      <div className="flex flex-col pt-24 pb-24 items-center justify-center w-full h-full">
        <div className="grid grid-cols-2 gap-8 mt-4 mb-8 justify-items-center">
          <Field.ChipSelect
            name={`answers[${questionnaireIndex}].value`}
            chips={options}
          />
        </div>
      </div>

      <DefaultButton
        disabled={isButtonDisabled}
        text={t('common.nextPage')}
        handleClick={() => handleSubmit()}
      />
    </main>
  );
}

export default QuestionScreen;
