import React from 'react';

import { MantineProvider } from '@mantine/core';

import { theme } from './theme';

// Wraps any React tree in the shared MantineProvider. The app has a single
// baked-in dark look (no runtime theme toggle), so the color scheme is forced
// to dark. Used at every React root: the legacy widget roots and Inertia.
export const withMantine = (children: React.ReactNode) => (
  <MantineProvider theme={theme} forceColorScheme="dark">
    {children}
  </MantineProvider>
);
