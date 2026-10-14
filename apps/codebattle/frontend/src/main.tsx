import { createInertiaApp } from '@inertiajs/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

import { initI18n } from '@/i18n';
import { ErrorBoundary } from '@/shared/ErrorBoundary';
import { ThemeProvider } from '@/theme/ThemeProvider';

type PageModule = { default: ComponentType };

// Controllers render pages by name (render_inertia("Lobby", ...)) → ./pages/Lobby.tsx.
const pages = import.meta.glob<PageModule>('./pages/*.tsx');

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

void createInertiaApp({
  progress: { color: 'var(--mantine-color-green-6)', showSpinner: false },
  // Phoenix checks CSRF via this header.
  http: { xsrfHeaderName: 'x-csrf-token' },
  resolve: async (name) => {
    const load = pages[`./pages/${name}.tsx`];

    if (!load) {
      throw new Error(`Page "${name}" does not exist (frontend/src/pages)`);
    }

    return (await load()).default;
  },
  setup({ App, el, props }) {
    if (!el) return;

    // The locale is fixed for the page (switching it reloads), so set it up once.
    initI18n(props.initialPage.props.locale);

    createRoot(el).render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <App {...props} />
          </ErrorBoundary>
        </QueryClientProvider>
      </ThemeProvider>,
    );
  },
});
