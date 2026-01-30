import { Typography } from '@mui/material';

interface FormErrorProps {
  error: string | null;
}

const FormError = ({ error }: FormErrorProps) => {
  if (!error) return null;
  return (
    <Typography variant="body2" color="error">
      {error}
    </Typography>
  );
};

export default FormError;
