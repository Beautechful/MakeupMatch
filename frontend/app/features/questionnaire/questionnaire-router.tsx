import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { FormLayout } from '~/components/layouts/form-layout';
import { Form } from '~/components/react-hook-form';
import { useConfig } from '~/context/config-context';
import { useMainFormContext } from '~/context/main-form-context';
import { useSnackbar } from '~/context/snackbar-context';
import LoadingScreen from '~/features/loading-screen/loading-screen';
import { usePostResults } from '~/features/results/hooks/use-results-hook';
import { QuestinnaireTypes } from '~/types/questionnaires-enum';

import CameraAnalysis from '../camera-analysis/camera-analysis';
import SensorPageRouter from '../sensor-analysis/sensor-page-router';
import { VotingScreen } from '../voting/voting-screen';

import { useQuestionsQuery } from './hooks/use-questions-query';
import QuestionScreen from './question-screen';
import QuestionnaireSummary from './questionnaire-summary';
import { mergeQuestionsAndAnswers } from './utils/get-results-translation';

export function QuestionnaireRouter() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmittedRef = useRef(false);

  const { methods } = useMainFormContext();
  const { data: questions, isPending } = useQuestionsQuery();
  const { i18n } = useTranslation();
  const { config } = useConfig();
  const postResults = usePostResults();
  const navigate = useNavigate();
  const { showError } = useSnackbar();

  function questionnaireSwitcher(currentQuestion: any, handleNext: () => void) {
    switch (currentQuestion?.question_type) {
      case QuestinnaireTypes.Scan:
        return (
          <SensorPageRouter
            questionnaireIndex={questionIndex}
            handleClick={handleNext}
          />
        );
      case QuestinnaireTypes.Camera:
        // handleNext();
        return <CameraAnalysis handleSubmit={handleNext} />;
      case QuestinnaireTypes.Question:
        return (
          <QuestionScreen
            questionnaireIndex={questionIndex}
            question={currentQuestion.question_text}
            options={currentQuestion.answer_options}
            handleSubmit={handleNext}
          />
        );
      case QuestinnaireTypes.Voting:
        return <VotingScreen handleSubmit={handleNext} />;
      default:
        return null;
    }
  }

  useEffect(() => {
    if (questions && questions[i18n.language]) {
      const prevAnswers = methods.getValues('answers') || [];
      const newQuestions = questions[i18n.language];
      const answers = newQuestions.map(
        (_: any, idx: number) => prevAnswers[idx] ?? { value: null },
      );

      methods.reset({ ...methods.getValues(), answers });
    }
  }, [questions, i18n.language, methods]);

  // Auto-submit when reaching the summary page
  useEffect(() => {
    const currentQuestions = questions?.[i18n.language] || [];
    console.log('Auto-submit effect triggered:', {
      questionsLength: currentQuestions.length,
      questionIndex,
      isSubmitting,
      hasSubmitted: hasSubmittedRef.current,
    });

    if (
      currentQuestions.length > 0 &&
      questionIndex === currentQuestions.length &&
      !isSubmitting &&
      !hasSubmittedRef.current
    ) {
      console.log('Setting up auto-submit timeout...');
      const timeoutId = setTimeout(() => {
        console.log(
          'Auto-submit timeout triggered, checking conditions again...',
        );
        if (!hasSubmittedRef.current) {
          console.log('Triggering auto-submit...');
          onSubmit();
        } else {
          console.log('Auto-submit skipped - already submitted');
        }
      }, 10); // 10 millisecond delay to show the summary

      return () => {
        console.log('Cleaning up auto-submit timeout');
        clearTimeout(timeoutId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, questions, i18n.language, isSubmitting]);

  if (isPending || postResults.isPending || isSubmitting) {
    return <LoadingScreen />;
  }

  function handleNext() {
    setQuestionIndex((prev) => prev + 1);
  }

  const { handleSubmit } = methods;

  const onSubmit = handleSubmit(async (data) => {
    if (isSubmitting || hasSubmittedRef.current) {
      console.log('Submission already in progress, ignoring duplicate call');
      return;
    }

    console.log('onSubmit called at:', new Date().toISOString());

    try {
      setIsSubmitting(true);
      hasSubmittedRef.current = true;
      const mergedAnswers = mergeQuestionsAndAnswers(
        questions,
        data.answers ?? [],
        i18n.language,
      );
      const payload = {
        config: config,
        answers: mergedAnswers,
      };
      postResults.mutate(payload, {
        onError: (error) => {
          setIsSubmitting(false);
          hasSubmittedRef.current = false; // Reset on error so user can retry
          showError(
            `Failed to submit Form Data: ${error.message || 'Unknown error'}`,
          );
        },
        onSuccess: (resultData) => {
          console.log('Results:', resultData);
          setIsSubmitting(false);
          navigate(`/results?userId=${resultData.user_id}`);
        },
      });
    } catch (error) {
      setIsSubmitting(false);
      hasSubmittedRef.current = false; // Reset on error so user can retry
      console.error('Failed to submit Form Data', error);
    }
  });

  const currentQuestions = questions?.[i18n.language] || [];
  const currentQuestion = currentQuestions[questionIndex];

  return (
    <Form onSubmit={onSubmit} methods={methods}>
      <FormLayout
        steps={currentQuestions.length}
        currentStep={questionIndex + 1}
      >
        {questionIndex === currentQuestions.length ? (
          <QuestionnaireSummary />
        ) : currentQuestion ? (
          questionnaireSwitcher(currentQuestion, handleNext)
        ) : null}
      </FormLayout>
    </Form>
  );
}

export default QuestionnaireRouter;
