import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';

import { connectToTournament, cancelTournament } from '../middlewares/Tournament';
import { connectToChat } from '../middlewares/Chat';

import { actions } from '../slices';
import * as selectors from '../selectors';

import Loading from '../components/Loading';

const TournamentState = ({ state, startsAt }) => {
  const timeStart = new Date(startsAt);
  const timeNowMs = new Date().getTime();
  const timeZoneOffset = timeStart.getTimezoneOffset();
  const currentTimeMs = timeNowMs + (timeZoneOffset * 60 * 1000);
  const diffTime = timeStart.getTime() - currentTimeMs;

  const [seconds, setSeconds] = useState(Math.floor(diffTime / 1000));

  const minutesToStart = (seconds - (seconds % 60)) / 60;
  const secondsToStart = Math.floor(seconds % 60) < 10 ? `0${seconds % 60}` : Math.floor(seconds % 60);

  useEffect(() => {
    if (seconds > 0) {
      setTimeout(() => setSeconds(seconds - 1), 1000);
    }
  }, [seconds]);

  if (state === 'waiting_participants') {
    if (seconds > 0) {
      return (
        <span>
          The tournament will start in&nbsp;
          {minutesToStart}
          :
          {secondsToStart}
        </span>
      );
    }
    return (<span>The tournament will start soon</span>);
  }
  if (state === 'active') {
    if (seconds > 0) {
      return (
        <span>
          The next round will start in&nbsp;
          {minutesToStart}
          :
          {secondsToStart}
          , or after all matches are over
        </span>
      );
    }
    return (<span>The next round will start soon</span>);
  }
  return (<span>The tournament will start soon</span>);
};

const HeaderOfTournament = ({ tournament, handleCancelTournament }) => {
  const {
    state,
    startsAt,
    creatorId,
    difficulty,
  } = tournament;

  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const difficultyBadgeColor = {
    elementary: 'info',
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  };

  const difficultyClassName = `badge badge-pill mr-1 badge-${difficultyBadgeColor[difficulty]}`;

  // TODO add actions for buttons
  const renderButtons = () => {
    if (creatorId === currentUserId) {
      if (state === 'waiting_participants' || state === 'active') {
        return (
          <>
            <button type="button" className="btn btn-outline-success mx-2">Start</button>
            <button type="button" onClick={handleCancelTournament} className="btn btn-outline-danger mx-2">Cancel</button>
            <a href="/tournaments" className="btn btn-success ml-2">Back to tournaments</a>
          </>
        );
      }
    }
    return (<button type="button" className="btn btn-success ml-2">Back to tournaments</button>);
  };

  if (tournament.state === 'loading') {
    return (<Loading />);
  }

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col-7">
            <div className="d-flex align-items-center">
              <h1>
                <span className="mr-3">
                  Name of Tournament
                </span>
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
              <TournamentState state={state} startsAt={startsAt} />
            </p>
          </div>
          <div className="col-5">
            <div className="text-right">
              {renderButtons()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Tournament = () => {
  const dispatch = useDispatch();

  const { statistics, tournament } = useSelector(selectors.tournamentSelector);
  const messages = useSelector(selectors.chatMessagesSelector);

  useEffect(() => {
    const currentUser = Gon.getAsset('current_user');

    dispatch(actions.setCurrentUser({ user: { ...currentUser } }));
    dispatch(connectToTournament());
    dispatch(connectToChat());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  console.log('statistics', statistics);
  console.log('tournament', tournament);

  const handleCancelTournament = () => {
    dispatch(cancelTournament());
  };

  // tournament.type === "individual";
  // tournament.type === "team";

  // ToDO: Use React.memo to avoid unnecessary rerenders of components
  //
  // Components:
  //   Chat
  //  ---- Individual Game ----
  //   Participants
  //   Matches
  //  ---- Team Game -----
  //   Panel with tournament info
  //     Participants
  //     Statistics
  //   Matches

  return (
    <HeaderOfTournament tournament={tournament} handleCancelTournament={handleCancelTournament} />
  );
};

export default Tournament;
