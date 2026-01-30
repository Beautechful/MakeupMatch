import { useTheme } from '@mui/material/styles';

import { cn } from '~/utils/cn';

interface ProgressCircleProps {
  state: 'visited' | 'active' | 'not-visited';
}

export function ProgressCircle({ state }: ProgressCircleProps) {
  const theme = useTheme();
  const isLargeScreen = window.matchMedia('(min-width: 1024px)').matches;
  const baseClass = isLargeScreen
    ? 'w-12 h-12 rounded-full inline-block'
    : 'w-6 h-6 rounded-full inline-block';
  let style_span = {};
  let stateClass = '';

  if (state === 'visited') {
    stateClass = '';
    style_span = { backgroundColor: theme.palette.primary.main };
  } else if (state === 'active') {
    stateClass = 'border-2';
    style_span = {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.background.paper,
    };
  } else {
    // not-visited
    stateClass = '';
    style_span = { backgroundColor: theme.palette.background.paper };
  }

  return <span className={cn([baseClass, stateClass])} style={style_span} />;
}
