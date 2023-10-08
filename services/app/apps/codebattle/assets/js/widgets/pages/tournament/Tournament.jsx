import React, { useCallback, useEffect, useMemo } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import TournamentStates from '../../config/tournament';
import { connectToChat } from '../../middlewares/Chat';
import {
  connectToTournament,
  kickFromTournament,
} from '../../middlewares/Tournament';
import * as selectors from '../../selectors';

import IndividualMatches from './IndividualMatches';
import Players from './Participants';
import TeamMatches from './TeamMatches';
import TournamentChat from './TournamentChat';
import TournamentHeader from './TournamentHeader';
// import TeamTournamentInfoPanel from './TeamTournamentInfoPanel';

function Matches({
  currentUserId, tournament, playersCount, isOver,
}) {
  if (tournament.state === TournamentStates.waitingParticipants) {
    return (
      <>
        <span className="d-flex justify-content-center align-items-center h-100">Tournament is not started yet</span>
      </>
    );
  }

  switch (tournament.type) {
    case 'team':
      return (
        <TeamMatches
          matches={tournament.matches}
          currentUserId={currentUserId}
        />
      );
    case 'individual':
      return (
        <IndividualMatches
          state={tournament.state}
          startsAt={tournament.startsAt}
          matches={tournament.matches}
          players={tournament.players}
          playersCount={playersCount}
          currentUserId={currentUserId}
          isOver={isOver}
          isLive={tournament.isLive}
          isOnline={tournament.channel.online}
        />
      );
    default: <></>;
  }
}

function Tournament() {
  const dispatch = useDispatch();

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isGuest = useSelector(selectors.currentUserIsGuestSelector);
  const tournament = useSelector(selectors.tournamentSelector);

  const playersCount = useMemo(
    () => Object.keys(tournament.players).length,
    [tournament.players],
  );
  const isOver = useMemo(
    () => [TournamentStates.finished, TournamentStates.cancelled].includes(
      tournament.state,
    ),
    [tournament.state],
  );

  const handleKick = useCallback(event => {
    const { playerId } = event.currentTarget.dataset;
    if (playerId) {
      kickFromTournament(playerId);
    }
  }, []);

  useEffect(() => {
    if (tournament.isLive) {
      const clearTournament = connectToTournament()(dispatch);
      const clearChat = connectToChat()(dispatch);

      return () => {
        clearTournament();
        clearChat();
      };
    }

    return () => { };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isGuest) {
    return (
      <>
        <h1 className="text-center">{tournament.name}</h1>
        <p className="text-center">
          <span>
            Please
            {' '}
            <a href="/session/new">sign in</a>
            {' '}
            to see the tournament
            details
          </span>
        </p>
      </>
    );
  }

  if (tournament.type === 'stairways') {
    return (
      <>
        <TournamentHeader
          id={tournament.id}
          state={tournament.state}
          startsAt={tournament.startsAt}
          type={tournament.type}
          accessType={tournament.accessType}
          accessToken={tournament.accessToken}
          isLive={tournament.isLive}
          name={tournament.name}
          players={tournament.players}
          playersCount={playersCount}
          playersLimit={tournament.playersLimit}
          creatorId={tournament.creatorId}
          currentUserId={currentUserId}
          level={tournament.level}
          isOver={isOver}
          isOnline={tournament.channel.online}
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
      </>
    );
  }

  return (
    <>
      <div className="container-fluid mb-2">
        <TournamentHeader
          id={tournament.id}
          state={tournament.state}
          startsAt={tournament.startsAt}
          type={tournament.type}
          accessType={tournament.accessType}
          accessToken={tournament.accessToken}
          name={tournament.name}
          players={tournament.players}
          playersCount={playersCount}
          playersLimit={tournament.playersLimit}
          creatorId={tournament.creatorId}
          currentUserId={currentUserId}
          level={tournament.level}
          isOver={isOver}
          isLive={tournament.isLive}
          isOnline={tournament.channel.online}
        />
      </div>
      <div className="container-fluid">
        <div className="row flex-lg-row-reverse">
          <div className="col-12 col-lg-9 mb-2 mb-lg-0">
            <div className="bg-white h-100 shadow-sm rounded-lg p-3">
              <Matches
                currentUserId={currentUserId}
                tournament={tournament}
                isOver={isOver}
                playersCount={playersCount}
              />
            </div>
          </div>
          <div className="d-flex flex-column flex-lg-column-reverse col-12 col-lg-3">
            <Players
              players={tournament.players}
              playersCount={playersCount}
              canBan={
                isAdmin
                && tournament.state === TournamentStates.waitingParticipants
              }
              handleKick={handleKick}
            />
            <TournamentChat />
          </div>
        </div>
      </div>
    </>
  );
}

export default Tournament;
