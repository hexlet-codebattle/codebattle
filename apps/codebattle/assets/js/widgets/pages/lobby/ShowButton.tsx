import React from 'react';

import i18n from '../../../i18n';

interface ShowButtonProps {
  url: string;
  type?: string;
}

function ShowButton({ url, type = 'table' }: ShowButtonProps) {
  return (
    <a
      type="button"
      className={`btn ${type === 'table' ? 'px-4 ml-1' : ''} btn-secondary btn-sm rounded-lg`}
      href={url}
    >
      {i18n.t('Show')}
    </a>
  );
}

export default ShowButton;
