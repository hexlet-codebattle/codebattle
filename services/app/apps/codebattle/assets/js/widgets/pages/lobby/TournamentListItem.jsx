import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import { getTournamentUrl } from '@/utils/urlBuilders';

import tournamentStates from '../../config/tournament';

const mapTournamentTitleByState = {
  [tournamentStates.waitingParticipants]: 'Waiting Players',
  [tournamentStates.active]: 'Playing',
  [tournamentStates.canceled]: 'Canceled',
  [tournamentStates.finished]: 'Finished',
};

const getActionText = tournament => {
  switch (tournament.state) {
    case tournamentStates.waitingParticipants:
      return 'Join';
    case tournamentStates.active:
      return 'Join';
    case tournamentStates.canceled:
      return 'Show';
    case tournamentStates.finished:
      return 'View results';
    default: return 'Show';
  }
};

const TournamentAction = ({ tournament }) => {
  if (tournament.state === tournamentStates.upcoming) {
    return <></>;
  }

  const className = cn('btn text-nowrap rounded', {
    'btn-secondary': [tournamentStates.finished, tournamentStates.canceled].includes(tournament.state),
    'cb-btn-success': [tournamentStates.active, tournamentStates.waitingParticipants].includes(tournament.state),
  });
  const text = getActionText(tournament);

  return (
    <a type="button" className={className} href={getTournamentUrl(tournament.id)}>{text}</a>
  );
};

export const activeIcon = <FontAwesomeIcon style={{ width: '60px', height: '60px' }} icon="laptop-code" className="text-warning" />;
export const upcomingIcon = <FontAwesomeIcon style={{ width: '60px', height: '60px' }} icon="clock" className="text-gray" />;

const TournamentListItem = ({ tournament, icon }) => (
  <div className="d-flex w-100 cb-bg-panel mt-1">
    <div className="d-none d-lg-block d-md-block p-3">
      {icon}
    </div>
    <div className="d-flex flex-column w-100 p-3 align-content-center align-items-baseline justify-content-between">
      <span
        title={tournament.name}
        className="h5 font-weight-bold text-white text-truncate d-inline-block"
        style={{ maxWidth: '400px', minWidth: '100px' }}
      >
        {tournament.name}
      </span>
      <span className="cb-font-size-small text-nowrap">
        <span>
          <FontAwesomeIcon icon="flag-checkered" className="mr-1" />
          {mapTournamentTitleByState[tournament.state]}
        </span>
        {tournamentStates.canceled !== tournament.state && (
          <>
            <span className="pl-2">
              <FontAwesomeIcon icon="user" className="mr-1" />
              {tournament.playersCount}
            </span>
          </>
        )}
        {[tournamentStates.active, tournamentStates.waitingParticipants, tournamentStates.upcoming].includes(tournament.state) && (
          <>
            <span className="pl-2">
              <FontAwesomeIcon icon="clock" className="mr-1" />
              {tournament.startsAt}
            </span>
          </>
        )}
        {tournament.state === tournamentStates.finished && (
          <>
            <span className="pl-2">
              <FontAwesomeIcon icon="clock" className="mr-1" />
              {tournament.lastRoundEndedAt}
            </span>
          </>
        )}
      </span>
    </div>
    <div className="p-3 align-content-center">
      <TournamentAction tournament={tournament} />
    </div>
  </div>
);

export default TournamentListItem;
