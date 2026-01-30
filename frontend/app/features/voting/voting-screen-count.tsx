import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { DefaultButton } from 'app/components/ui/default-button';
import { IconTrend } from '~/components/ui/icons';
import { IconAI } from '~/components/ui/icons/icon-ai';
import { IconCheck } from '~/components/ui/icons/icon-check';
import { QuestionnaireTitle } from '~/components/ui/questionnaire-title';
import theme from '~/styles/theme';

import LoadingScreen from '../loading-screen/loading-screen';

import { useVotingAnswer } from './hooks/use-voting-answer';
import { usePoll } from './hooks/use-voting-poll';
import VotingEndPopup from './voting-end-popup';

interface VotingProps {
  numberOfVotes: number;
  handleSubmit: () => void;
  userId?: string;
}
const selectionRingColor = theme.palette.primary.main;
function ImageCard({
  src,
  alt,
  handleImageSelect,
  index,
  selectedImage,
}: {
  src: string;
  alt: string;
  handleImageSelect: (index: number) => void;
  index: number;
  selectedImage: number | null;
}) {
  return (
    <div className="flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleImageSelect(index);
        }}
        className={`relative rounded-2xl overflow-hidden transition-all ${
          selectedImage === index ? 'shadow-lg' : 'hover:opacity-80'
        }`}
        style={{
          boxShadow:
            selectedImage === index
              ? `0 0 0 4px ${selectionRingColor}, 0 10px 15px -3px rgba(0, 0, 0, 0.1)`
              : 'none',
          transform: selectedImage === index ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <div
          className="w-40 h-40 sm:w-120 sm:h-120 [@media(orientation:landscape)]:w-32 [@media(orientation:landscape)]:h-32 [@media(orientation:landscape)]:sm:w-60 [@media(orientation:landscape)]:sm:h-60 relative"
          style={{ backgroundColor: theme.palette.primary.light }}
        >
          <img src={src} alt={alt} className="object-cover w-full h-full" />
        </div>
      </button>
    </div>
  );
}

function Instructions(Icon: any, textKey: string) {
  return (
    <div className="flex flex-row gap-2 sm:gap-6 items-center">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& svg': {
            height: {
              xs: '25px',
              md: '70px',
            },
            width: {
              xs: '25px',
              md: '70px',
            },
          },
        }}
      >
        <Icon color={theme.palette.primary.dark} />
      </Box>
      <Typography
        variant="h4"
        fontWeight={500}
        color="text.primary"
        align="left"
        sx={{
          typography: {
            xs: 'body2', // small screens
            sm: 'h5', // tablet
            md: 'h4', // desktop
          },
          '@media (orientation: landscape)': {
            typography: 'h6',
          },
        }}
      >
        <Trans
          i18nKey={textKey}
          components={{
            bold: <Box component="span" sx={{ fontWeight: 'bold' }} />,
          }}
        />
      </Typography>
    </div>
  );
}

export function VotingScreen({
  numberOfVotes,
  handleSubmit,
  userId,
}: VotingProps) {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const pollMutation = usePoll();
  const pollData = pollMutation.data;
  const pollLoading = pollMutation.isPending;
  const votingAnswerMutation = useVotingAnswer();
  const [voteCount, setVoteCount] = useState(1);
  const [state, setState] = useState('voting');

  useEffect(() => {
    pollMutation.mutate();
  }, []);
  useEffect(() => {
    if (pollData) {
      console.log('Variant A ID:', pollData.variant_a_id);
      console.log('Variant B ID:', pollData.variant_b_id);
      console.log('Full poll data:', pollData);
    }
  }, [pollData]);
  const handleImageSelect = (index: number) => {
    setSelectedImage(index);
  };
  if (pollLoading) {
    return <LoadingScreen forceScreenSize={false} />;
  }

  function nextVote() {
    setVoteCount((prevCount) => prevCount + 1);
    setSelectedImage(null);
    pollMutation.mutate();
  }
  function sendVote(index: number) {
    // Placeholder function to handle vote submission
    console.log(`Voted for image index: ${index}`);
    const winner =
      index === 0 ? pollData?.variant_a_id : pollData?.variant_b_id;
    if (!pollData || !winner) {
      console.error('Poll data or winner variant ID is missing');
      return;
    }
    votingAnswerMutation.mutate({
      variant_a_id: pollData.variant_a_id,
      variant_b_id: pollData.variant_b_id,
      winner_variant_id: winner,
      user_id: userId ?? '',
    });

    if (voteCount < (state === 'endlessVoting' ? Infinity : numberOfVotes)) {
      nextVote();
    } else {
      setState('endPopup');
    }
  }
  const imageSrcA = pollData?.variant_a_url;
  const imageSrcB = pollData?.variant_b_url;
  return (
    <main className="flex flex-col items-center justify-center gap-2 bg-white w-full h-full">
      {/* Title */}
      <QuestionnaireTitle title={t('voting.title')} />
      <Typography
        variant="h6"
        color="text.secondary"
        align="center"
        className=""
      >
        {voteCount}/
        {state === 'endlessVoting' ? (
          <span style={{ fontFamily: 'Arial' }}>ထ</span>
        ) : (
          numberOfVotes
        )}
      </Typography>

      <div className="flex flex-row [@media(orientation:landscape)]:gap-4">
        {/* Left column */}
        <div className="flex flex-col items-center justify-center gap-4 [@media(orientation:landscape)]:w-1/2">
          {/* Image selection cards */}
          <div className="flex flex-row flex-wrap justify-center gap-4">
            <ImageCard
              src={imageSrcA ?? '/image1.png'}
              alt="Makeup look option 1"
              handleImageSelect={handleImageSelect}
              selectedImage={selectedImage}
              index={0}
            />

            <ImageCard
              src={imageSrcB ?? '/image2.png'}
              alt="Makeup look option 2"
              handleImageSelect={handleImageSelect}
              selectedImage={selectedImage}
              index={1}
            />
          </div>

          {/* Instruction text */}

          <div className="flex flex-col gap-4 p-2 sm:gap-12 sm:p-20 [@media(orientation:landscape)]:hidden">
            {Instructions(IconTrend, 'voting.instruction1')}
            {Instructions(IconAI, 'voting.instruction2')}
            {Instructions(IconCheck, 'voting.instruction3')}
          </div>

          {/* Next button */}
          <DefaultButton
            disabled={selectedImage === null}
            text={t('common.nextPage')}
            handleClick={() => sendVote(selectedImage as number)}
          />
        </div>

        {/* Right column - instructions for landscape mode */}
        <div className="hidden [@media(orientation:landscape)]:flex [@media(orientation:landscape)]:w-1/2 flex-col gap-4 p-2 sm:gap-4 sm:p-20">
          {Instructions(IconTrend, 'voting.instruction1')}
          {Instructions(IconAI, 'voting.instruction2')}
          {Instructions(IconCheck, 'voting.instruction3')}
        </div>
      </div>

      {state === 'endPopup' && (
        <VotingEndPopup
          handleEndButton={() => {
            setState('voting');
            handleSubmit();
          }}
          handleContinueButton={() => {
            setState('endlessVoting');
            nextVote();
          }}
        />
      )}
    </main>
  );
}

export default VotingScreen;
