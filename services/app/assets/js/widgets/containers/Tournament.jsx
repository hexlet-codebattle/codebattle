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
import TournamentStates from '../config/tournament';

import TournamentChat from '../components/TournamentChat';
import Participants from '../components/Participants';
import IndividualMatches from '../components/IndividualMatches';
import TournamentHeader from '../components/TournamentHeader';
import TeamTournamentInfoPanel from '../components/TeamTournamentInfoPanel';
import TeamMatches from '../components/TeamMatches';


const Tournament = () => {
  const dispatch = useDispatch();

  const { statistics, tournament } = useSelector(selectors.tournamentSelector);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const messages = useSelector(selectors.chatMessagesSelector);

  useEffect(() => {
    const currentUser = Gon.getAsset('current_user');

    dispatch(actions.setCurrentUser({ user: { ...currentUser } }));
    dispatch(connectToTournament());
    dispatch(connectToChat());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tournament.state === TournamentStates.loading) {
    return <></>;
  }

  if (tournament.type === 'team') {
    return (
      <>
        <TournamentHeader
          state={tournament.state}
          startsAt={tournament.startsAt}
          creatorId={tournament.creatorId}
          currentUserId={currentUserId}
          difficulty={tournament.difficulty}
          handleStartTournament={startTournament}
          handleCancelTournament={cancelTournament}
        />
        <div className="container-fluid mt-4">
          <div className="row">
            <div className="col-3">
              <TournamentChat messages={messages} />
            </div>
            <div className="col-9 mt-3">
              <div className="row">
                <div className="col-12">
                  <TeamTournamentInfoPanel
                    state={tournament.state}
                    players={tournament.players}
                    statistics={statistics}
                    currentUserId={currentUserId}
                  />
                </div>
                <div className="col-12 mt-4">
                  <TeamMatches
                    matches={tournament.data.matches}
                    currentUserId={currentUserId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TournamentHeader
        state={tournament.state}
        startsAt={tournament.startsAt}
        currentUserId={currentUserId}
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
              currentUserId={currentUserId}
            />
          </div>
          <div className="col-9 bg-white shadow-sm py-4">
            <IndividualMatches
              state={tournament.state}
              matches={tournament.data.matches}
              playersCount={tournament.data.players.length}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Tournament;
