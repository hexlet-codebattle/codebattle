export type InertiaPageProps = Record<string, unknown>;

let currentProps: InertiaPageProps | undefined;

const readInitialPageProps = (): InertiaPageProps => {
  const element = document.getElementById('app');
  const serializedPage = element?.dataset.page;

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
