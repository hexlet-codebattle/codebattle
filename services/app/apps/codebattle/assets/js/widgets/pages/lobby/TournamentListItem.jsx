import React from 'react';

import NiceModal from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import getIconForGrade from '@/components/icons/Grades';
import TournamentTimer from '@/components/TournamentTimer';
import { getRankingPoints, grades } from '@/config/grades';
import modalCodes from '@/config/modalCodes';
import { getTournamentUrl } from '@/utils/urlBuilders';

import dayjs from '../../../i18n/dayjs';
import tournamentStates from '../../config/tournament';

const mapTournamentTitleByState = {
  [tournamentStates.waitingParticipants]: 'Waiting Players',
  [tournamentStates.active]: 'Playing',
  [tournamentStates.canceled]: 'Canceled',
  [tournamentStates.finished]: 'Finished',
};

const getDateFormat = grade => {
  switch (grade) {
    case grades.open: return 'MMM D, YYYY [at] ';
    default: return '[at] h:mma';
  }
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
      return 'Results';
    default:
      return 'Show';
  }
};

const TournamentTitle = ({ tournament }) => {
  if (tournament.grade === grades.open) {
    return (
      <span
        title={tournament.name}
        className="h5 mb-1 font-weight-bold text-white text-truncate d-inline-block"
        style={{ maxWidth: '210px', minWidth: '210px' }}
      >
        {tournament.name}
      </span>
    );
  }

  const words = tournament.name.split(' ');
  const subtitle = words[words.length - 1];
  words.pop();
  const title = words.join(' ');

  return (
    <div className="d-flex flex-column align-items-baseline">
      <span
        className="h5 mb-1 font-weight-bold text-white text-truncate d-inline-block"
      >
        {title}
      </span>
      <span className="small">{subtitle}</span>
    </div>
  );
};

const TournamentAction = ({ tournament, isAdmin = false }) => {
  const infoClassName = 'btn btn-outline-secondary cb-btn-outline-secondary mx-2 px-3 cb-rounded border-0';

  const actionClassName = cn('btn text-nowrap px-2 cb-rounded', {
    'btn-secondary cb-btn-secondary': [
      tournamentStates.finished,
      tournamentStates.canceled,
    ].includes(tournament.state),
    'btn-success cb-btn-success': [
      tournamentStates.active,
      tournamentStates.upcoming,
      tournamentStates.waitingParticipants,
    ].includes(tournament.state),
  });

  const text = getActionText(tournament);

  const openTournamentInfo = () => {
    NiceModal.show(modalCodes.tournamentModal, { tournament });
  };

  return (
    <div className="align-content-center">
      <div className="d-flex">
        {(tournament.state !== tournamentStates.upcoming || isAdmin) && (
          <a
            type="button"
            className={actionClassName}
            href={getTournamentUrl(tournament.id)}
          >
            {text}
          </a>
        )}
        <button
          type="button"
          className={infoClassName}
          onClick={openTournamentInfo}
        >
          <FontAwesomeIcon icon="info" />
        </button>
      </div>
    </div>
  );
};

const showStartsAt = state => (
  [
    tournamentStates.active,
    tournamentStates.waitingParticipants,
    tournamentStates.upcoming,
  ].includes(state)
);

export const activeIcon = (
  <FontAwesomeIcon
    style={{ width: '60px', height: '60px' }}
    icon="laptop-code"
    className="text-warning"
  />
);
export const upcomingIcon = (
  <FontAwesomeIcon
    style={{ width: '60px', height: '60px' }}
    icon="clock"
    className="text-gray"
  />
);

const TournamentListItem = ({ tournament, icon, isAdmin = false }) => (
  <div className="border cb-border-color cb-rounded cb-subtle-background my-2 mr-2" style={{ width: '350px' }}>
    <div className="d-flex flex-column p-3 align-content-center align-items-baseline">
      <div className="d-flex align-items-center">
        <div className="d-none d-lg-block d-md-block">
          {icon || getIconForGrade(tournament.grade)}
        </div>
        <TournamentTitle tournament={tournament} />
      </div>
      <div className="cb-separator mb-2" />
      <div className="d-flex w-100 justify-content-between">
        <div className="d-flex flex-column align-items-baseline">
          {tournament.grade !== grades.open && (
            <span
              title={tournament.name}
              className="text-nowrap"
            >
              <FontAwesomeIcon icon="trophy" className="mr-1" />
              {getRankingPoints(tournament.grade)[0]}
              <span className="ml-1">Ranking Points</span>
            </span>
          )}
          <span className="text-nowrap">
            {tournament.state !== 'upcoming' && (
              <span className="mr-2">
                <FontAwesomeIcon icon="flag-checkered" className="mr-1" />
                {mapTournamentTitleByState[tournament.state]}
              </span>
            )}
            {tournamentStates.canceled !== tournament.state
              && tournament.state !== 'upcoming' && (
                <span>
                  <FontAwesomeIcon icon="user" className="mr-1" />
                  {tournament.playersCount}
                </span>
              )}
          </span>
          {showStartsAt(tournament.state) && (
            <>
              <span>
                <FontAwesomeIcon icon="clock" className="mr-1" />
                <TournamentTimer label="starts in" date={tournament.startsAt}>
                  {dayjs(tournament.startsAt).format(getDateFormat(tournament.grade))}
                </TournamentTimer>
              </span>
            </>
          )}
          {tournament.state === tournamentStates.finished && (
            <>
              <span className="d-none d-lg-inline d-md-inline d-sm-inline pr-2">
                <FontAwesomeIcon icon="clock" className="mr-1" />
                {dayjs(tournament.lastRoundEndedAt).format(getDateFormat(tournament.grade))}
              </span>
            </>
          )}
        </div>
        <TournamentAction tournament={tournament} isAdmin={isAdmin} />
      </div>
    </div>
  </div>
);

export default TournamentListItem;
