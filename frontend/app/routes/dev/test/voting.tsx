// import { CloseLayout } from '~/components/layouts/close-layout';
import { FormLayout } from '~/components/layouts/form-layout';
import { Form } from '~/components/react-hook-form/form-provider';
import { MainFormProvider } from '~/context/main-form-context';
import { VotingScreen } from '~/features/voting/voting-screen';

import type { Route } from './+types/voting';

// eslint-disable-next-line
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Makeup Match' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Questionnaire() {
  return (
    // <CloseLayout>
    <MainFormProvider>
      <Form onSubmit={() => {}} methods={1 as any}>
        <FormLayout steps={3} currentStep={1}>
          <VotingScreen handleSubmit={() => {}} userId="test-user" />
        </FormLayout>
      </Form>
    </MainFormProvider>
    // </CloseLayout>
  );
}
