import React from 'react';

import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { gameStatusSelector } from '../../selectors';

function BackToTournamentButton() {
  const { tournamentId } = useSelector(gameStatusSelector);
  const tournamentUrl = `/tournaments/${tournamentId}`;

  return (
    <a className="btn btn-secondary btn-block rounded-lg" href={tournamentUrl}>
      {i18next.t('Back to tournament')}
    </a>
  );
}

export default BackToTournamentButton;
