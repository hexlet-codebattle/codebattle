import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function TournamentType({ type }) {
  if (type === 'individual') {
    return <FontAwesomeIcon icon="users" />;
  }

  if (type === 'team') {
    return (
      <>
        <FontAwesomeIcon icon="users" />
        vs
        <FontAwesomeIcon icon="users" />
      </>
    );
  }

  if (type === 'stairway') {
    return (
      <>
        <FontAwesomeIcon icon="user" />
        <FontAwesomeIcon icon="sort-amount-up" />
      </>
    );
  }

  return <FontAwesomeIcon icon="question-circle" title="Unknown tournament type" />;
}

export default TournamentType;
