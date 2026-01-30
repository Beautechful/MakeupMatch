import { type ReactNode, createContext, useContext } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import type { ImprovementOption } from '~/features/feedback/types';

export interface FeedbackFormData {
  rating: number;
  improvements: ImprovementOption[];
  opinions: string;
}

interface FeedbackFormContextProps {
  children: ReactNode;
}

type FeedbackFormContextValue = {
  methods: UseFormReturn<FeedbackFormData, any, FeedbackFormData>;
} | null;

const FeedbackFormContext = createContext<FeedbackFormContextValue>(null);

export const FeedbackFormProvider = ({
  children,
}: FeedbackFormContextProps) => {
  const defaultValues: FeedbackFormData = {
    rating: 0,
    improvements: [],
    opinions: '',
  };

  const methods = useForm<FeedbackFormData>({
    defaultValues,
    mode: 'onChange',
  });

  return (
    <FeedbackFormContext.Provider value={{ methods }}>
      {children}
    </FeedbackFormContext.Provider>
  );
};

export const useFeedbackFormContext = () => {
  const context = useContext(FeedbackFormContext);
  if (context === null) {
    throw new Error(
      'useFeedbackFormContext must be used within a FeedbackFormProvider',
    );
  }
  return context;
};
