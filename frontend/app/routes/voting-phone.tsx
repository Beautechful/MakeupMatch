// import { CloseLayout } from '~/components/layouts/close-layout';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { MainFormProvider } from '~/context/main-form-context';
import { VotingScreen } from '~/features/voting/voting-screen-count';
import VotingWelcome from '~/features/voting/voting-welcome';

import type { Route } from './dev/test/+types/voting';

// eslint-disable-next-line
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Makeup Match' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function PublicVoting() {
  const navigate = useNavigate();
  const [state, setState] = useState('welcome');

  const handleSubmit = () => {
    // Redirect to the same page (reload)
    navigate(0); // or navigate('.')
  };
  return (
    // <CloseLayout>
    <MainFormProvider>
      <div className="mx-auto h-full pt-20 sm:pt-4">
        {state === 'welcome' ? (
          <VotingWelcome handleButton={() => setState('voting')} />
        ) : (
          <VotingScreen
            numberOfVotes={15}
            handleSubmit={handleSubmit}
            userId="test-user"
          />
        )}
      </div>
    </MainFormProvider>
    // </CloseLayout>
  );
}
