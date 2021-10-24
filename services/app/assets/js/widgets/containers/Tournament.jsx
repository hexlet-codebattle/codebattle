import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import {
  connectToTournament,
  cancelTournament,
  startTournament,
} from '../middlewares/Tournament';
import { connectToChat } from '../middlewares/Chat';

import { actions } from '../slices';
import * as selectors from '../selectors';

import TournamentChat from './TournamentChat';
import Participants from './Participants';
import IndividualMatches from '../components/IndividualMatches';
import TournamentHeader from '../components/TournamentHeader';
import TournamentStates from '../config/tournament';

const currentUser = Gon.getAsset('current_user');

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

  if (tournament.state === TournamentStates.loading) {
    return <></>;
  }

  // tournament.type === "individual";
  // tournament.type === "team";
  if (tournament.type === 'team') {
    return (
      <>
        <TournamentHeader
          state={tournament.state}
          startsAt={tournament.startsAt}
          creatorId={tournament.creatorId}
          difficulty={tournament.difficulty}
          handleStartTournament={startTournament}
          handleCancelTournament={cancelTournament}
        />
        {/* <TeamTournamentInfoPanel
          players={tournament.players}
          statistics={statistics}
        />
        <TeamMatches
          state={tournament.state}
          matches={tournament.matches}
        /> */}
      </>
    );
  }

  return (
    <>
      <TournamentHeader
        state={tournament.state}
        startsAt={tournament.startsAt}
        creatorId={tournament.creatorId}
        difficulty={tournament.difficulty}
        handleStartTournament={startTournament}
        handleCancelTournament={cancelTournament}
      />
      <div className="container-fluid">
        <div className="row">
          <div className="col-3">
            <TournamentChat messages={messages} />
            <Participants
              players={tournament.data.players}
              state={tournament.state}
              creatorId={tournament.creatorId}
            />
          </div>
          <IndividualMatches
            state={tournament.state}
            matches={tournament.data.matches}
            playersCount={tournament.data.players.length}
          />
        </div>
      </div>
    </>
  );
};

export default Tournament;
