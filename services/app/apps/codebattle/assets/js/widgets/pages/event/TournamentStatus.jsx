import React from 'react';

import i18next from 'i18next';

const TournamentStatus = ({
  type = 'loading',
}) => {
  switch (type) {
    case 'finished': return (
      <span
        style={{ width: 80 }}
        className="badge cb-custom-event-badge-danger text-self-center"
      >
        {i18next.t('closed')}
      </span>
    );
    case 'active': return (
      <span
        style={{ width: 80 }}
        className="badge cb-custom-event-badge-success text-self-center"
      >
        {i18next.t('active')}
      </span>
    );
    case 'loading': return (
      <span
        style={{ width: 80 }}
        className="badge badge-secondary text-self-center"
      >
        {i18next.t('...')}
      </span>
    );
    case 'waiting_participants':
    default: return (
      <span
        style={{ width: 80 }}
        className="badge cb-custom-event-badge-warning text-self-center"
      >
        {i18next.t('soon')}
      </span>
    );
  }
};

export default TournamentStatus;
