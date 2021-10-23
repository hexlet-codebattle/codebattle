import React, { useEffect, useState, memo } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';

import Loading from './Loading';
import * as selectors from '../selectors';
import TournamentStates from '../config/tournament';

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

const TournamentHeader = memo(props => {
  const {
    state,
    startsAt,
    creatorId,
    difficulty,
    handleStartTournament,
    handleCancelTournament,
  } = props;

  const currentUserId = useSelector(selectors.currentUserIdSelector, selectors.currentUserIdSelector);

  const difficultyBadgeColor = {
    elementary: 'info',
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  };

  const difficultyClassName = `badge badge-pill mr-1 badge-${difficultyBadgeColor[difficulty]}`;

  if (state === TournamentStates.loading) {
    return <Loading />;
  }

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col-7">
            <div className="d-flex align-items-center">
              <h1>
                <span className="mr-3">Name of Tournament</span>
              </h1>
              <div>
                <span className={difficultyClassName}>&nbsp;</span>
                {difficulty}
              </div>
            </div>
            <p>
              <span className="small text-muted mx-2">
                State:&nbsp;
                {state}
              </span>
              <TournamentTimer state={state} startsAt={startsAt} />
            </p>
          </div>
          <div className="col-5">
            <div className="text-right">
              {creatorId === currentUserId && (
                state === TournamentStates.waitingParticipants || state === TournamentStates.active) && (
                  <>
                    {state === TournamentStates.waitingParticipants && (
                      <button
                        type="button"
                        onClick={handleStartTournament}
                        className="btn btn-outline-success mx-2"
                      >
                        Start
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCancelTournament}
                      className="btn btn-outline-danger mx-2"
                    >
                      Cancel
                    </button>
                  </>
                )}
              <a href="/tournaments" className="btn btn-success ml-2">
                Back to tournaments
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default TournamentHeader;
