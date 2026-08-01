import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import i18n from '../../i18n';
import tournamentTypeCodes from '../config/tournamentTypes';

const TournamentTypeCodes = tournamentTypeCodes as Record<string, string>;

interface TournamentTypeProps {
  type: string;
}

function TournamentType({ type }: TournamentTypeProps) {
  if (type === TournamentTypeCodes.versus) {
    return i18n.t('Versus');
  }

  if (type === TournamentTypeCodes.swiss) {
    return i18n.t('Swiss');
  }

  if (type === TournamentTypeCodes.individual) {
    return <FontAwesomeIcon icon="users" />;
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

  if (type === TournamentTypeCodes.show) {
    return <FontAwesomeIcon icon="wine-bottle" />;
  }

  return <FontAwesomeIcon title={i18n.t('Unknown tournament type')} icon="question-circle" />;
}

export default TournamentType;
