import React from 'react';
import i18n from '../../../i18n';

export default function BackToHomeButton() {
  const title = i18n.t('Back to Home');
  const handleClick = () => {
    window.location.href = '/';
  };

  return (
    <button className="btn btn-secondary btn-block rounded-lg" onClick={handleClick} type="button">
      {title}
    </button>
  );
}
