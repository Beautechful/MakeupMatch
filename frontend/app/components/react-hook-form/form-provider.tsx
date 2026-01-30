import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';

export type FormProps = {
  children: React.ReactNode;
  methods: UseFormReturn<any>;
  onSubmit?: () => void;
};

export function Form({ children, onSubmit, methods }: FormProps) {
  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} autoComplete="off">
        {children}
      </form>
    </FormProvider>
  );
}
