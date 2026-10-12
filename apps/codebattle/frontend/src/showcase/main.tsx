import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Showcase } from './Showcase';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Showcase />
    </ThemeProvider>
  </StrictMode>,
);
