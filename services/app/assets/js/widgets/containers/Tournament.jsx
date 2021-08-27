import React, { useEffect, useState, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import moment from 'moment';

import { connectToTournament, cancelTournament, startTournament } from '../middlewares/Tournament';
import { connectToChat } from '../middlewares/Chat';

import { actions } from '../slices';
import * as selectors from '../selectors';

import Loading from '../components/Loading';
import TournamentChat from './TournamentChat';
import Participants from './Participants';
import TournamentStates from '../config/tournament';

const currentUser = Gon.getAsset('current_user');

const TournamentHeader = ({ state, startsAt }) => {
  const timeStart = moment.utc(startsAt);
  const diffTime = moment(timeStart).diff(moment());

  const [seconds, setSeconds] = useState(Math.floor(diffTime / 1000));

  const minutesToStart = (seconds - (seconds % 60)) / 60;
  const secondsToStart = Math.floor(seconds % 60) < 10 ? `0${seconds % 60}` : Math.floor(seconds % 60);

  useEffect(() => {
    if (seconds > 0) {
      setTimeout(() => setSeconds(seconds - 1), 1000);
    }
  }, [seconds]);

  const titles = {
    [TournamentStates.active]: time => (time > 0
      ? (
        <span>
          The next round will start in&nbsp;
          {minutesToStart}
          :
          {secondsToStart}
          , or after all matches are over
        </span>
      )
      : (<span>The tournament will start soon</span>)),
    [TournamentStates.waitingParticipants]: time => (time > 0
      ? (
        <span>
          The tournament will start in&nbsp;
          {minutesToStart}
          :
          {secondsToStart}
        </span>
      )
      : (<span>The tournament will start soon</span>)),
    [TournamentStates.cancelled]: () => (<span>The tournament is cancelled</span>),
    [TournamentStates.finished]: () => (<span>The tournament is finished</span>),
  };

  return titles[state](seconds);
};

const HeaderOfTournament = memo((props) => {
  const {
    state,
    startsAt,
    creatorId,
    difficulty,
    handleStartTournament,
    handleCancelTournament
  } = props;

  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const difficultyBadgeColor = {
    elementary: 'info',
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  };

  const difficultyClassName = `badge badge-pill mr-1 badge-${difficultyBadgeColor[difficulty]}`;

  if (tournament.state === TournamentStates.loading) {
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
              <TournamentHeader state={state} startsAt={startsAt} />
            </p>
          </div>
          <div className="col-5">
            <div className="text-right">
              {creatorId === currentUserId && (state === TournamentStates.waitingParticipants || state === TournamentStates.active) && (
                <>
                  {state === TournamentStates.waitingParticipants && <button type="button" onClick={handleStartTournament} className="btn btn-outline-success mx-2">Start</button>}
                  <button type="button" onClick={handleCancelTournament} className="btn btn-outline-danger mx-2">Cancel</button>
                </>
              )}
              <a href="/tournaments" className="btn btn-success ml-2">Back to tournaments</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

const getLinkParams = (match) => {
  const isParticipant = match.players.some(({ id }) => id === currentUser.id);

  switch (true) {
    case (match.state === "waiting" && isParticipant): return ['Wait', 'bg-warning'];
    case (match.state === "active" && isParticipant): return ['Join', 'bg-warning'];
    case isParticipant: return ['Show', 'x-bg-gray'];
    default: return ['Show', ''];
  }
};

const Matches = memo(({ type, matches, playersCount }) => {
  const roundsCount = Math.log2(playersCount);
  const roundsRange = Array(roundsCount).fill(roundsCount).map((, index) => index + 1);

  return (<>
      <div className="col-9 bg-white shadow-sm py-4">
        <div className="d-flex justify-content-around">
          {roundsRange.map(round => {
            const tournamentStage = playersCount / Math.pow(2, round);
            const title = tournamentStage === 1 ? "Final" : `1/${tournamentStage}`;

            return <h4>{title}</h4>
          })}
        </div>

        <div className="bracket">
          {roundsRange.map(round => {
            return (<div className="round">
              <div className="match">
                <div className="match__content">
                  {matches[round].map((match) => (<>
                    <div className={`d-flex p-1 border border-success ${getLinkParams(match)[1]}`}>
                      <div className="d-flex flex-columnt justify-content-around align-items-center">
                        <p>${match.state</p>
                        <a href="/games/#{@match.game_id}" className="btn btn-success m-1">${getLinkParams(match)[0]}</a>
                      </div>
                      <div className="d-flex.flex-column.justify-content-around">
                        <div className={`tournament-bg-${match.state}`}
                          <UserInfo user={match.players[0] />
                        </div>
                        <div className={`tournament-bg-${match.state}`}
                          <UserInfo user={match.players[1] />
                        </div>
                    </div>
                  </>)}
                </div>
              </div>
            </div>);
          })}
        </div>
      </div>
    </>);
});

const Tournament = () => {
  const dispatch = useDispatch();

  const { statistics, tournament } = useSelector(selectors.tournamentSelector);
  const messages = useSelector(selectors.chatMessagesSelector);

  useEffect(() => {

    dispatch(actions.setCurrentUser({ user: { ...currentUser } }));
    dispatch(connectToTournament());
    dispatch(connectToChat());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tournament.type === "individual";
  // tournament.type === "team";
  if (tournament.type === "team") {
    return (<>
      <HeaderOfTournament
        state={tournament.state}
        startsAt={tournament.startsAt}
        creatorId={tournament.creatorId}
        difficulty={tournament.difficulty}
        handleStartTournament,
        handleCancelTournament
      />
      // Panel with tournament info
      // <Participants
      //   players={tournament.data.players}
      //   state={tournament.state}
      //   creatorId={tournamet.creatorId}
      // />
      // <Statistics
      //   statistics={statistics}
      // />
      //
      // <Matches
      //   matches={tournament.data.matches}
      // >
    </>);
  }

  // TODO: Use React.memo to avoid unnecessary rerenders of components
  //
  // Components:
  //   + Header
  //   + Chat
  //  ---- Individual Game ----
  //   + Participants
  //   ? Matches
  //  ---- Team Game -----
  //   ? Panel with tournament info
  //     ? Participants
  //     ? Statistics
  //   ? Matches

  return (<>
    <HeaderOfTournament
      state={tournament.state}
      startsAt={tournament.startsAt}
      creatorId={tournament.creatorId}
      difficulty={tournament.difficulty}
      handleStartTournament,
      handleCancelTournament
    />
    <TournamentChat
      messages={messages}
    />
    <Participants
      players={tournament.data.players}
      state={tournament.state}
      creatorId={tournamet.creatorId}
    />
    <Matches
      type={tournament.type}
      matches={tournament.data.matches}
    />

  </>);
};

export default Tournament;
