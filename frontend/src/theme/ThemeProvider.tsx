import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './global.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';

import { cssVariablesResolver } from './cssVariables';
import { theme } from './theme';

// Dark stays the default (the legacy UI was dark-only). The choice persists in
// localStorage via Mantine's default color scheme manager.
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="dark">
      <Notifications position="top-right" limit={4} />
      {children}
    </MantineProvider>
  );
}
