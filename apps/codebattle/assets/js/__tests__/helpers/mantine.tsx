import React from 'react';

import { MantineProvider } from '@mantine/core';

import { cssVariablesResolver, theme } from '../../widgets/ui/theme';

// Wraps a subtree in the app's MantineProvider for tests. Mantine v9 components
// throw without a provider in the tree, so any test that mounts one must use this.
export const MantineTestProvider = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    forceColorScheme="dark"
  >
    {children}
  </MantineProvider>
);
