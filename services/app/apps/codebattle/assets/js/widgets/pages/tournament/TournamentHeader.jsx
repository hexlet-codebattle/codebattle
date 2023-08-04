/* eslint-disable */
import React, {
 useEffect, useState, memo, useMemo,
} from 'react';
import moment from 'moment';

import { useSelector } from 'react-redux';
import Loading from '../../components/Loading';
import TournamentStates from '../../config/tournament';
import JoinButton from './JoinButton';
import TournamentMainControlButtons from './TournamentMainControlButtons';
import * as selectors from '../../selectors';

const TournamentTimer = ({ state, startsAt }) => {
  const timeStart = moment.utc(startsAt);
  const diffTime = moment(timeStart).diff(moment());

  const [seconds, setSeconds] = useState(Math.floor(diffTime / 1000));

  const minutesToStart = (seconds - (seconds % 60)) / 60;
  const secondsToStart = Math.floor(seconds % 60) < 10
      ? `0${seconds % 60}`
      : Math.floor(seconds % 60);

  useEffect(() => {
    if (seconds > 0) {
      setTimeout(() => setSeconds(seconds - 1), 1000);
    }
  }, [seconds]);

  const titles = {
    [TournamentStates.active]: time => (time > 0 ? (
      <span>
        The next round will start in&nbsp;
        {minutesToStart}
        :
        {secondsToStart}
        , or after all matches are over
      </span>
      ) : (
        <span>The tournament will start soon</span>
      )),
    [TournamentStates.waitingParticipants]: time => (time > 0 ? (
      <span>
        The tournament will start in&nbsp;
        {minutesToStart}
        :
        {secondsToStart}
      </span>
      ) : (
        <span>The tournament will start soon</span>
      )),
    [TournamentStates.cancelled]: () => (
      <span>The tournament is cancelled</span>
    ),
    [TournamentStates.finished]: () => <span>The tournament is finished</span>,
  };

  return titles[state](seconds);
};

const TournamentHeader = props => {
  const {
    state,
    type,
    isLive,
    name,
    startsAt,
    insertedAt,
    intendedPlayers,
    creatorId,
    accessToken,
    currentUserId,
    difficulty,
  } = props;
  const difficultyBadgeColor = useMemo(() => ({
    elementary: 'info',
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  }), []);

  const difficultyClassName = useMemo(() => (
    `badge badge-pill mr-1 badge-${difficultyBadgeColor[difficulty]}`
  ), [difficulty]);
  const isOver = useMemo(() => (
    state === TournamentStates.finished || state === TournamentStates.cancelled
  ), [state]);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const canModerate = useMemo(() => (
    creatorId === currentUserId || isAdmin
  ), [creatorId, currentUserId, isAdmin]);

  if (state === TournamentStates.loading) {
    return <Loading />;
  }

  return (
    <>
      <div className="d-flex align-items-center border-bottom">
        <h1 className="m-0 text-capitalize text-nowrap">
          {name}
        </h1>
        <div className="text-center ml-3" data-toggle="tooltip" data-placement="right" title="">
          <img src="" alt="" />
        </div>
        {!isOver && (
        <div className="ml-auto">
          <JoinButton
            isShow={state !== TournamentStates.active}
            isParticipant={intendedPlayers.some(item => item.id === currentUserId)}
          />
          {canModerate
            && (
            <TournamentMainControlButtons
              state={state}
            />
          )}
        </div>
            )}

      </div>
      <div className="d-flex align-items-center mt-2">
        <div>
          <span>{`State: ${state}`}</span>
          <span className="ml-3">{`Type: ${type}`}</span>
          {canModerate && (
          <>
            <span className="ml-3">Access: public</span>
            <span className="ml-3">{`is live: ${isLive}`}</span>
          </>
          )}
          <span className="ml-3">{`Starts on ${startsAt}`}</span>
          <span className="ml-3">{`Insterted at ${insertedAt}`}</span>
          <TournamentTimer state={state} startsAt={startsAt} />
          {canModerate && <span className="ml-3">{`Private url: ${accessToken}`}</span>}
        </div>
      </div>
    </>
  );
};

export default memo(TournamentHeader);
