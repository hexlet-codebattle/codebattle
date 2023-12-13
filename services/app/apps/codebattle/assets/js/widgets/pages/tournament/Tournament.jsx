import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import isEmpty from 'lodash/isEmpty';
import ReactMarkdown from 'react-markdown';
import { useDispatch, useSelector } from 'react-redux';

import TournamentStates from '../../config/tournament';
import { connectToChat } from '../../middlewares/Chat';
import {
  connectToTournament,
  kickFromTournament,
} from '../../middlewares/Tournament';
import * as selectors from '../../selectors';

import CustomTournamentInfoPanel from './CustomTournamentInfoPanel';
import DetailsModal from './DetailsModal';
import IndividualMatches from './IndividualMatches';
import MatchConfirmationModal from './MatchConfirmationModal';
import Players from './PlayersPanel';
import StartRoundConfirmationModal from './StartRoundConfirmationModal';
import TeamMatches from './TeamMatches';
import TournamentChat from './TournamentChat';
import TournamentHeader from './TournamentHeader';

function InfoPanel({
  currentUserId, tournament, playersCount, isAdmin, isOwner,
}) {
  if (
    tournament.state === TournamentStates.waitingParticipants
    && tournament.type !== 'team'
  ) {
    return (
      <div className="h-100">
        <ReactMarkdown source={tournament.description} />
      </div>
    );
  }

  switch (tournament.type) {
    case 'individual':
      return (
        <IndividualMatches
          matches={tournament.matches}
          players={tournament.players}
          playersCount={playersCount}
          currentUserId={currentUserId}
        />
      );
    case 'team':
      return (
        <TeamMatches
          state={tournament.state}
          players={tournament.players}
          teams={tournament.meta.teams}
          matches={tournament.matches}
          currentUserId={currentUserId}
        />
      );
    default: {
      if (isEmpty(tournament.players)) return <></>;

      return (
        <CustomTournamentInfoPanel
          players={tournament.players}
          topPlayerIds={tournament.topPlayerIds}
          matches={tournament.matches}
          tournamentId={tournament.id}
          currentUserId={currentUserId}
          roundsLimit={tournament.meta?.roundsLimit}
          currentRound={tournament.currentRound}
          pageNumber={tournament.playersPageNumber}
          pageSize={tournament.playersPageSize}
          showResults={tournament.showResults}
          isAdmin={isAdmin}
          isOwner={isOwner}
        />
      );
    }
  }
}

function Tournament() {
  const dispatch = useDispatch();

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isOwner = useSelector(selectors.currentUserIsTournamentOwnerSelector);
  const isGuest = useSelector(selectors.currentUserIsGuestSelector);
  const tournament = useSelector(selectors.tournamentSelector);

  const [
    detailsModalShowing,
    setDetailsModalShowing,
  ] = useState(false);
  const [
    startRoundConfirmationModalShowing,
    setStartRoundConfirmationModalShowing,
  ] = useState(false);
  const [
    matchConfirmationModalShowing,
    setMatchConfirmationModalShowing,
  ] = useState(false);

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

  const handleOpenDetails = useCallback(() => {
    setDetailsModalShowing(true);
  }, [setDetailsModalShowing]);
  const onCloseRoundConfirmationModal = useCallback(() => {
    setStartRoundConfirmationModalShowing(false);
  }, [setStartRoundConfirmationModalShowing]);
  const handleKick = useCallback(event => {
    const { playerId } = event.currentTarget.dataset;
    if (playerId) {
      kickFromTournament(Number(playerId));
    }
  }, []);
  const handleStartRound = useCallback(setStartRoundConfirmationModalShowing, [setStartRoundConfirmationModalShowing]);

  useEffect(() => {
    const clearTournament = connectToTournament()(dispatch);

    return () => {
      clearTournament();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tournament.isLive) {
      const clearChat = connectToChat(tournament.useChat)(dispatch);

      return () => {
        clearChat();
      };
    }

    return () => { };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => {
      if (matchConfirmationModalShowing) {
        setDetailsModalShowing(false);
        setStartRoundConfirmationModalShowing(false);
      }
    },
    [
      matchConfirmationModalShowing,
      setStartRoundConfirmationModalShowing,
      setDetailsModalShowing,
    ],
  );

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

  const matchTimeoutSeconds = tournament.meta?.roundsConfigType === 'per_round'
    ? tournament.meta?.roundsConfig[tournament.currentRound]?.roundTimeoutSeconds
    : tournament.matchTimeoutSeconds;

  return (
    <>
      <DetailsModal
        tournament={tournament}
        modalShowing={detailsModalShowing}
        setModalShowing={setDetailsModalShowing}
      />
      <StartRoundConfirmationModal
        meta={tournament.meta}
        currentRound={tournament.currentRound}
        level={tournament.level}
        matchTimeoutSeconds={tournament.matchTimeoutSeconds}
        taskPackName={tournament.taskPackName}
        taskProvider={tournament.taskProvider}
        modalShowing={startRoundConfirmationModalShowing}
        onClose={onCloseRoundConfirmationModal}
      />
      <MatchConfirmationModal
        players={tournament.players}
        matches={tournament.matches}
        currentUserId={currentUserId}
        modalShowing={matchConfirmationModalShowing}
        setModalShowing={setMatchConfirmationModalShowing}
      />
      <div className="container-fluid mb-2">
        <TournamentHeader
          id={tournament.id}
          accessToken={tournament.accessToken}
          accessType={tournament.accessType}
          breakDurationSeconds={tournament.breakDurationSeconds}
          breakState={tournament.breakState}
          creatorId={tournament.creatorId}
          currentUserId={currentUserId}
          isLive={tournament.isLive}
          isOnline={tournament.channel.online}
          isOver={isOver}
          lastRoundEndedAt={tournament.lastRoundEndedAt}
          lastRoundStartedAt={tournament.lastRoundStartedAt}
          level={tournament.level}
          matchTimeoutSeconds={matchTimeoutSeconds}
          name={tournament.name}
          players={tournament.players}
          playersCount={playersCount}
          playersLimit={tournament.playersLimit}
          showResults={tournament.showResults}
          startsAt={tournament.startsAt}
          state={tournament.state}
          type={tournament.type}
          handleStartRound={handleStartRound}
          handleOpenDetails={handleOpenDetails}
        />
      </div>
      <div className="container-fluid mb-2">
        <div className="row flex-lg-row-reverse">
          <div className="col-12 col-lg-9 mb-2 mb-lg-0">
            <div className="bg-white h-100 shadow-sm rounded-lg p-3 overflow-auto">
              <InfoPanel
                tournament={tournament}
                playersCount={playersCount}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isOwner={isOwner}
              />
            </div>
          </div>
          <div className="d-flex flex-column flex-lg-column-reverse col-12 col-lg-3 h-100">
            <Players
              playersCount={tournament.playersCount}
              players={tournament.players}
              canBan={
                isAdmin
                && tournament.state === TournamentStates.waitingParticipants
              }
              handleKick={handleKick}
            />
            {tournament.useChat && (<TournamentChat />)}
          </div>
        </div>
      </div>
    </>
  );
}

export default Tournament;
