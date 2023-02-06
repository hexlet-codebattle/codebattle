import React from 'react';
import { useSelector } from 'react-redux';
import { gameStatusSelector } from '../../selectors';

const BackToTournamentButton = () => {
  const { tournamentId } = useSelector(gameStatusSelector);
  const tournamentUrl = `/tournaments/${tournamentId}`;

  return (
    <a className="btn btn-secondary btn-block" href={tournamentUrl}>
      Back to tournament
    </a>
  );
};

export default BackToTournamentButton;
