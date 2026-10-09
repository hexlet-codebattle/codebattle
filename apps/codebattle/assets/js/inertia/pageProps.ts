export type InertiaPageProps = Record<string, unknown>;

let currentProps: InertiaPageProps | undefined;

// Inertia v3 renders the initial page as <script data-page="app" type="application/json">;
// older servers put it in the `data-page` attribute of #app. Modules read props at import
// time, before Inertia's setup() runs, so this has to read the DOM itself.
const readSerializedPage = (): string | undefined =>
  document.querySelector('script[data-page="app"][type="application/json"]')?.textContent ??
  document.getElementById('app')?.dataset.page;

const readInitialPageProps = (): InertiaPageProps => {
  const serializedPage = readSerializedPage();

  if (!serializedPage) {
    const sharedProps = document.getElementById('inertia-shared-props')?.dataset.props;

    if (!sharedProps) {
      return {};
    }

    try {
      return JSON.parse(sharedProps) as InertiaPageProps;
    } catch {
      return {};
    }
  }

  try {
    const page = JSON.parse(serializedPage) as { props?: InertiaPageProps };
    return page.props ?? {};
  } catch {
    return {};
  }
};

export const setPageProps = (props: InertiaPageProps) => {
  currentProps = props;
};

export const getPageProps = (): InertiaPageProps => currentProps ?? readInitialPageProps();

export const getPageProp = <T = unknown>(key: string, fallback?: T): T => {
  const props = getPageProps();
  const value = props[key];

  return (value === undefined ? fallback : value) as T;
};
