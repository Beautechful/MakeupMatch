import { CloseLayout } from '~/components/layouts/close-layout';
import { MainFormProvider } from '~/context/main-form-context';
import QuestionnaireRouter from '~/features/questionnaire/questionnaire-router';

import type { Route } from './+types/questionnaire';

// eslint-disable-next-line
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Makeup Match' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Questionnaire() {
  return (
    <CloseLayout>
      <MainFormProvider>
        <QuestionnaireRouter />
      </MainFormProvider>
    </CloseLayout>
  );
}
