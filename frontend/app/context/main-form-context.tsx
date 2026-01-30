import { type ReactNode, createContext, useContext } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import type { MainFormData } from '~/types/main-form-types';

interface MainFormContextProps {
  children: ReactNode;
}

type MainFormContextValue = {
  methods: UseFormReturn<MainFormData, any, MainFormData>;
} | null;

const MainFormContext = createContext<MainFormContextValue>(null);

export const MainFormProvider = ({ children }: MainFormContextProps) => {
  const defaultValues: MainFormData = {
    answers: [],
  };
  const methods = useForm({ defaultValues });

  const value = {
    methods,
  };

  return (
    <MainFormContext.Provider value={value}>
      {children}
    </MainFormContext.Provider>
  );
};

export const useMainFormContext = () => {
  const context = useContext(MainFormContext);
  if (context === null) {
    throw new Error(
      'useMainFormContext must be used within a MainFormProvider',
    );
  }
  return context;
};
