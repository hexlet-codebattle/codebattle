import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function TournamentType({ type }) {
  if (type === 'ladder') {
    return 'Ladder';
  }

  if (type === 'swiss') {
    return 'Swiss';
  }

  if (type === 'individual') {
    return (<FontAwesomeIcon icon="users" />);
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

  return (
    <FontAwesomeIcon
      title="Unknown tournament type"
      icon="question-circle"
    />
  );
}

export default TournamentType;
