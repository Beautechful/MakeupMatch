// import Button from '@mui/material/Button';
import { NavLink } from 'react-router';

import { DefaultButton } from './default-button';

interface NavButtonProps {
  text: string;
  url: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge'; // Define size options
  style?: React.CSSProperties; // Allow passing custom styles
}

export function NavButton({ text, url, size, style }: NavButtonProps) {
  return (
    <nav>
      <NavLink to={url} end>
        <DefaultButton
          text={text}
          handleClick={() => {}}
          size={size}
          style={style}
        />
      </NavLink>
    </nav>
  );
}
