import React, { type ComponentType } from 'react';

import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

import { setPageProps } from './inertia/pageProps';

type InertiaPageModule = {
  default: ComponentType;
};

const pages = import.meta.glob<InertiaPageModule>('./inertia/pages/**/*.tsx');

const inertiaPaths = [
  /^\/schedule\/?$/,
  /^\/hall_of_fame\/?$/,
  /^\/seasons(?:\/[^/]+)?\/?$/,
  /^\/h2h\/[^/]+\/[^/]+\/?$/,
  /^\/tasks\/[^/]+\/?$/,
  /^\/tournaments\/?$/,
  /^\/tournaments\/[^/]+\/edit\/?$/,
];

const installsInertiaNavigation = () => {
  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');

    if (!link || link.target || link.hasAttribute('download')) {
      return;
    }

    const url = new URL(link.href, window.location.href);

    if (
      url.origin !== window.location.origin ||
      !inertiaPaths.some((path) => path.test(url.pathname))
    ) {
      return;
    }

    event.preventDefault();
    router.visit(`${url.pathname}${url.search}${url.hash}`);
  });
};

export const initializeInertiaApp = () => {
  if (!document.getElementById('app')) {
    return;
  }

  installsInertiaNavigation();

  void createInertiaApp({
    progress: {
      color: '#2ae881',
      showSpinner: false,
    },
    resolve: async (name) => {
      const pagePath = `./inertia/pages/${name}.tsx`;
      const loadPage = pages[pagePath];

      if (!loadPage) {
        throw new Error(`Unknown Inertia page: ${name}`);
      }

      return loadPage();
    },
    setup({ App, el, props }) {
      setPageProps(props.initialPage.props);
      createRoot(el).render(<App {...props} />);
    },
  });
};
