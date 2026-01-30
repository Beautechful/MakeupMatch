// import Button from '@mui/material/Button';

import { Typography } from '@mui/material';

import { SmallLarge } from '../layouts/small-large';

interface QuestionnaireTitleProps {
  title: string;
  subtitle?: string;
}

export function QuestionnaireTitle({
  title,
  subtitle,
}: QuestionnaireTitleProps) {
  return (
    <SmallLarge
      child_small={
        <div className="mb-6">
          <Typography
            variant="h5"
            fontWeight={600}
            color="text.primary"
            align="center"
            className="mb-2"
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" align="center">
              {subtitle}
            </Typography>
          )}
        </div>
      }
      child_large={
        <div className="mb-6">
          <Typography
            variant="h2"
            fontWeight={800}
            color="text.primary"
            align="center"
            className="pb-4"
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="h4"
              fontWeight={600}
              color="text.secondary"
              align="center"
            >
              {subtitle}
            </Typography>
          )}
        </div>
      }
    />
  );
}
