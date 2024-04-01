import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import TournamentTypeCodes from '../config/tournamentTypes';

function TournamentType({ type }) {
  if (type === TournamentTypeCodes.versus) {
    return 'Versus';
  }

  if (type === TournamentTypeCodes.arena) {
    return 'Arena';
  }

  if (type === TournamentTypeCodes.swiss) {
    return 'Swiss';
  }

  if (type === TournamentTypeCodes.individual) {
    return (<FontAwesomeIcon icon="users" />);
  }

  if (type === TournamentTypeCodes.team) {
    return (
      <>
        <FontAwesomeIcon icon="users" />
        vs
        <FontAwesomeIcon icon="users" />
      </>
    );
  }

  if (type === TournamentTypeCodes.stairway) {
    return (
      <>
        <FontAwesomeIcon icon="user" />
        <FontAwesomeIcon icon="sort-amount-up" />
      </>
    );
  }

  if (type === TournamentTypeCodes.show) {
    return (
      <FontAwesomeIcon icon="wine-bottle" />
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
