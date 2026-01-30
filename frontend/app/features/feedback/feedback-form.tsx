import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { Form } from '~/components/react-hook-form';
import {
  RatingFifth,
  RatingFirst,
  RatingFourth,
  RatingSecond,
  RatingThird,
} from '~/components/ui/icons';
import type { IconType } from '~/components/ui/icons/icon.type';
import {
  type FeedbackFormData,
  useFeedbackFormContext,
} from '~/context/feedback-form-context';
import { useSnackbar } from '~/context/snackbar-context';
import { usePostFeedback } from '~/features/feedback/hooks/use-post-feedback';
import { ImprovementOption, type Rating } from '~/features/feedback/types';
import theme from '~/styles/theme';
import { cn } from '~/utils/cn';

const ratingIcons: Record<Rating, React.FC<IconType>> = {
  1: RatingFirst,
  2: RatingSecond,
  3: RatingThird,
  4: RatingFourth,
  5: RatingFifth,
};

const defaultValues: FeedbackFormData = {
  rating: 0,
  improvements: [],
  opinions: '',
};

interface FeedbackFormProps {
  onClose: () => void;
  userId?: string;
}

export const FeedbackForm = ({ onClose, userId }: FeedbackFormProps) => {
  const { t } = useTranslation();
  const { methods } = useFeedbackFormContext();
  const { showError } = useSnackbar();
  const { mutateAsync: submitFeedback, isPending } = usePostFeedback();

  const { register, handleSubmit, setValue, watch, getValues, reset } = methods;

  const ratings: Rating[] = [1, 2, 3, 4, 5];

  const selectedRating = watch('rating');

  const isButtonDisabled = selectedRating === 0 || isPending;

  const handleClickRating = (num: Rating) => {
    setValue('rating', selectedRating === num ? 0 : num, {
      shouldValidate: true,
    });
  };

  const toggleImprovement = (option: ImprovementOption) => {
    const current = getValues('improvements') || [];
    setValue(
      'improvements',
      current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option],
      { shouldValidate: true },
    );
  };

  const onSubmit = handleSubmit(async (data: FeedbackFormData) => {
    try {
      const payload = { ...data, user_id: userId };
      await submitFeedback(payload);
      onClose();
      reset(defaultValues);
    } catch (error) {
      showError(`Failed to submit Feedback: ${(error as Error).message}`);
    }
  });

  return (
    <Form onSubmit={onSubmit} methods={methods}>
      <div className="flex flex-col gap-6 items-center w-full">
        <div>
          <div className="flex gap-1 sm:gap-0">
            {ratings.map((num) => {
              const Icon = ratingIcons[num];
              const isSelected = selectedRating === num;
              return (
                <button
                  aria-label={`Rate ${num} stars`}
                  aria-pressed={isSelected}
                  key={num}
                  type="button"
                  onClick={() => handleClickRating(num)}
                >
                  <Icon
                    className="h-14 w-14 sm:w-28 sm:h-28 transform transition-transform duration-400 hover:scale-105"
                    color={
                      isSelected ? theme.palette.secondary.main : 'currentColor'
                    }
                  />
                </button>
              );
            })}
          </div>
          <input type="hidden" {...register('rating', { required: true })} />
        </div>

        <div className="flex gap-2 flex-col">
          <Typography
            variant="body1"
            fontWeight={600}
            color="text.primary"
            className="mb-2"
          >
            {t('feedback.improvement.title')}
          </Typography>

          <div className="flex flex-wrap gap-2 lg:pb-8">
            {Object.values(ImprovementOption).map((option) => {
              const isSelected = watch('improvements')?.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleImprovement(option)}
                  className={cn(
                    'rounded-[15px] border px-4 py-2 text-left transition-colors text-sm sm:text-md',
                    {
                      'text-white': isSelected,
                      'bg-white text-gray-800 hover:bg-gray-100': !isSelected,
                    },
                  )}
                  style={{
                    backgroundColor: isSelected
                      ? theme.palette.primary.main
                      : theme.palette.background.default,
                    borderColor: isSelected
                      ? theme.palette.primary.main
                      : theme.palette.border.shadow,
                  }}
                >
                  {t(`feedback.improvement.options.${option}`)}
                </button>
              );
            })}
          </div>

          <input type="hidden" {...register('improvements')} />
        </div>

        <div className="flex gap-2 flex-col w-full lg:hidden">
          <Typography variant="body1" fontWeight={600} color="text.primary">
            {t('feedback.others')}
          </Typography>
          <textarea
            rows={4}
            className="text-sm resize-none rounded-xl border p-3 h-[153px] w-full focus:border-[#906B4D]
            focus:ring-2 focus:ring-[#906B4D] focus:outline-none"
            style={{
              borderColor: theme.palette.border.shadow,
            }}
            placeholder={t('feedback.othersPlaceholder')}
            {...register('opinions')}
          />
        </div>

        <div className="flex w-full sm:w-fit">
          <button
            disabled={isButtonDisabled}
            type="submit"
            className="text-md sm:text-lg rounded-lg bg.primary.main px-4 py-2 text-white w-full
               transform transition-transform duration-400 font-semibold
               enabled:hover:scale-105 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isButtonDisabled
                ? theme.palette.border.shadow
                : theme.palette.primary.main,
            }}
          >
            {t('feedback.submit')}
          </button>
        </div>
      </div>
    </Form>
  );
};
