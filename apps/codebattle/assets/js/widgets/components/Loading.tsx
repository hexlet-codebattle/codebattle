import React from 'react';

import i18n from '../../i18n';

interface LoadingProps {
  adaptive?: boolean;
  large?: boolean;
  small?: boolean;
}

const getSize = ({ small = false, large = false, adaptive = false }: LoadingProps) => {
  switch (true) {
    case adaptive:
      return 16;
    case small:
      return 30;
    case large:
      return 100;
    default:
      return 50;
  }
};

function Loading(props: LoadingProps) {
  const size = getSize(props);

  return (
    <div className="d-flex my-0 py-1 justify-content-center">
      <div
        className="spinner-border text-secondary"
        style={{ width: `${size}px`, height: `${size}px` }}
        role="status"
      >
        <span className="sr-only">{i18n.t('Loading...')}</span>
      </div>
    </div>
  );
}

export default Loading;
