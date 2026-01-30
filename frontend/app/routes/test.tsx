import ColorScannerExample from '~/components/color-scanner-example';
import { ColorSensorProvider } from '~/context/color-sensor';

import type { Route } from './+types/test';

// eslint-disable-next-line
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Makeup Match' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function TestPage() {
  return (
    <div>
      {/* <NixQuickTest /> */}
      <ColorSensorProvider>
        <ColorScannerExample />
      </ColorSensorProvider>
    </div>
  );
}
