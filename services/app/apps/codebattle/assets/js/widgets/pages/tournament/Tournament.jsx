import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import {
  connectToTournament,
} from '../../middlewares/Tournament';
import { connectToChat } from '../../middlewares/Chat';

import { actions } from '../../slices';
import * as selectors from '../../selectors';
import TournamentStates from '../../config/tournament';

import TournamentChat from './TournamentChat';
import Participants from './Participants';
import IndividualMatches from './IndividualMatches';
import TournamentHeader from './TournamentHeader';
import TeamTournamentInfoPanel from './TeamTournamentInfoPanel';
import TeamMatches from './TeamMatches';
import IndividualIntendedPlayersPanel from './IndividualIntendedPlayersPanel';

function Tournament() {
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

  if (tournament.type === 'stairways') {
    return (
      <>
        <TournamentHeader
          state={tournament.state}
          startsAt={tournament.startsAt}
          creatorId={tournament.creatorId}
          currentUserId={currentUserId}
          difficulty={tournament.difficulty}
        />
        Tournament stairways
        {/* Chat  */}
        {/* <StairwayTournamentInfoPanel
          state={tournament.state}
          currentUserId={currentUserId}
          rounds={tournament.rounds}
          players={tournament.players}
        /> */}
        {/* StairwayInfoTable
        tournament state: active, game_over

        views: on approved list, participants list, action
          stairway:
            list round with progress (selected, begin, over, not started),
            round list: buttons
            stairway match panel: (default) players list with info about match progress (won, lost, give_up), task info
            players list (table):
              - player1 (current_user, opponent), state match, action (show)
              - player2, state match, action (show)
        */}
        {/* <StairwayTournamentApprovedListPanel
          state={tournament.state}
          creatorId={tournament.creatorId}
          currentUserId={currentUserId}
          players={tournament.players}
          notApprovedList={tournament.notApprovedList}
        /> */}
        {/* StairwayPanelApprovedList
        tournament state: waiting_participants

        view: list "on approved", list "participants"

        actions:
          player:
            assign to list "on approved" (current_user)
            owner tournament assign me list "participants"

          owner:
            players actions
            kick players
        */}
      </>
);
  }

  if (tournament.type === 'team') {
    return (
      <div className="container-fluid mt-4">
        <div className="row">
          <div className="col-3">
            <TournamentChat messages={messages} />
          </div>
          <div className="col-9">
            <div className="row">
              <div className="col-12">
                <div className="bg-white shadow-sm rounded p-4">
                  <TournamentHeader
                    state={tournament.state}
                    startsAt={tournament.startsAt}
                    creatorId={tournament.creatorId}
                    currentUserId={currentUserId}
                    difficulty={tournament.difficulty}
                  />
                  {}
                </div>
              </div>
              <div className="col-12 mt-3">
                <TeamTournamentInfoPanel
                  state={tournament.state}
                  players={tournament.players}
                  statistics={statistics}
                  currentUserId={currentUserId}
                />
              </div>
              <div className="col-12 mt-4">
                <TeamMatches
                  matches={tournament.matches}
                  currentUserId={currentUserId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col-3">
            <TournamentChat messages={messages} />
            {tournament.state === TournamentStates.active && (
            <Participants
              players={tournament.players}
              state={tournament.state}
              creatorId={tournament.creatorId}
              currentUserId={currentUserId}
            />
            )}
          </div>
          <div className="col-9 bg-white shadow-sm py-4">
            <TournamentHeader
              state={tournament.state}
              startsAt={tournament.startsAt}
              currentUserId={currentUserId}
              creatorId={tournament.creatorId}
              difficulty={tournament.difficulty}
            />
            <IndividualIntendedPlayersPanel
              state={tournament.state}
              intentedPlayers={tournament.intentedPlayers}
              participantPlayers={tournament.players}
              currentUserId={currentUserId}
            />
            <IndividualMatches
              state={tournament.state}
              matches={tournament.matches}
              playersCount={tournament.players.length}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Tournament;
