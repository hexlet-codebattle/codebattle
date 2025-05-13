import React from 'react';

import i18next from 'i18next';

function BackToEventButton() {
  const eventUrl = '/';

  return (
    <a className="btn btn-secondary btn-block rounded-lg" href={eventUrl}>
      {i18next.t('Back to event')}
    </a>
  );
}

export default BackToEventButton;
