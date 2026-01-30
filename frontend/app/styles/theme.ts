import { createTheme } from '@mui/material/styles';

// Module augmentation for custom palette

declare module '@mui/material/styles' {
  interface Palette {
    availability: {
      available: string;
      online: string;
      unavailable: string;
    };
    border: {
      shadow: string;
    };
  }

  interface PaletteOptions {
    availability?: {
      available: string;
      online: string;
      unavailable: string;
    };
    border?: {
      shadow: string;
    };
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#906B4D',
      dark: '#4d3725',
      light: '#E1BC9D',
    },
    secondary: {
      main: '#C49E91',
    },
    background: {
      default: '#FFFFFF',
      paper: '#C4C4C4', // Reverted to original value
    },
    text: {
      primary: '#000000',
      secondary: '#6B6B6B',
    },
    availability: {
      available: '#1DBA4A', // green
      online: '#FFA500', // orange
      unavailable: '#FF3B30', // red
    },
    border: {
      shadow: '#E0E0E0',
    },
  },
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
    button: {
      textTransform: 'none',
    },
    h3: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.2,
      [`@media (min-width:600px)`]: {
        fontSize: '2.5rem',
      },
    },
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '14px',
          backgroundColor: 'white',
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#906B4D',
          },
          '&.has-filters .MuiOutlinedInput-notchedOutline': {
            borderColor: '#906B4D',
          },
          '&.has-filters': {
            color: '#906B4D',
          },
        },
        notchedOutline: {
          borderColor: '#ccc',
        },
        input: {
          padding: '8px 12px',
        },
      },
    },
  },
});

export default theme;
