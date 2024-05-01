import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { useInterpret } from '@xstate/react';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import ReactMarkdown from 'react-markdown';
import { useDispatch, useSelector } from 'react-redux';

import TournamentStates from '../../config/tournament';
import { connectToChat } from '../../middlewares/Chat';
import { connectToTournament } from '../../middlewares/TournamentAdmin';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import useSearchParams from '../../utils/useSearchParams';

import CustomTournamentInfoPanel from './CustomTournamentInfoPanel';
import DetailsModal from './DetailsModal';
import IndividualMatches from './IndividualMatches';
import MatchConfirmationModal from './MatchConfirmationModal';
import Players from './PlayersPanel';
import StartRoundConfirmationModal from './StartRoundConfirmationModal';
import TeamMatches from './TeamMatches';
import TournamentChat from './TournamentChat';
import TournamentClanTable from './TournamentClanTable';
import TournamentHeader from './TournamentHeader';

const getTournamentPresentationStatus = state => {
  switch (state) {
    case TournamentStates.finished:
      return 'Tournament finished';
    default:
      return 'Waiting';
  }
};

function InfoPanel({
  currentUserId, tournament, playersCount, hideResults, canModerate,
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
          matchTimeoutSeconds={tournament.matchTimeoutSeconds}
          taskList={tournament.taskList}
          type={tournament.type}
          topPlayerIds={tournament.topPlayerIds}
          matches={tournament.matches}
          tournamentId={tournament.id}
          currentUserId={currentUserId}
          roundsLimit={tournament.meta?.roundsLimit}
          currentRoundPosition={tournament.currentRoundPosition}
          pageNumber={tournament.playersPageNumber}
          pageSize={tournament.playersPageSize}
          hideBots={!tournament.showBots}
          hideResults={hideResults}
          hideCustomGameConsole={tournament.type !== 'versus' || tournament.state !== TournamentStates.active}
          canModerate={canModerate}
        />
      );
    }
  }
}

function TournamentAdminWidget({ waitingRoomMachine }) {
  const dispatch = useDispatch();

  const searchParams = useSearchParams();

  useInterpret(waitingRoomMachine);

  const activePresentationMode = searchParams.has('presentation');

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isOwner = useSelector(selectors.currentUserIsTournamentOwnerSelector);
  const isGuest = useSelector(selectors.currentUserIsGuestSelector);
  const tournament = useSelector(selectors.tournamentSelector);

  const hideResults = tournament.showResults === undefined
    ? false
    : !tournament.showResults;

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
    () => Object.values(tournament.players)
      .filter(player => (tournament.showBots ? true : !player.isBot))
      .length,
    [tournament.players, tournament.showBots],
  );
  const isOver = useMemo(
    () => [TournamentStates.finished, TournamentStates.cancelled].includes(
      tournament.state,
    ),
    [tournament.state],
  );
  const canModerate = useMemo(
    () => isOwner || isAdmin,
    [isOwner, isAdmin],
  );

  const handleOpenDetails = useCallback(() => {
    setDetailsModalShowing(true);
  }, [setDetailsModalShowing]);
  const onCloseRoundConfirmationModal = useCallback(() => {
    setStartRoundConfirmationModalShowing(false);
  }, [setStartRoundConfirmationModalShowing]);
  const toggleShowBots = useCallback(() => {
    dispatch(actions.toggleShowBots());
  }, [dispatch]);
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

  if (activePresentationMode) {
    return (
      <>
        <MatchConfirmationModal
          players={tournament.players}
          matches={tournament.matches}
          currentUserId={currentUserId}
          modalShowing={matchConfirmationModalShowing}
          setModalShowing={setMatchConfirmationModalShowing}
          currentRoundPosition={tournament.currentRoundPosition}
          redirectImmediatly={activePresentationMode}
        />
        <div
          className="d-flex flex-column justify-content-center align-items-center p-3"
        >
          {has(tournament.players, currentUserId) || tournament.state !== TournamentStates.waitingParticipants
            ? (
              <span className="h3">
                {getTournamentPresentationStatus(tournament.state)}
              </span>
            ) : (
              <>
                <span className="h3">{tournament.name}</span>
              </>
            )}
        </div>
      </>
    );
  }

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

  // Temporary not support different timeouts for rounds
  // const matchTimeoutSeconds = tournament.meta?.roundsConfigType === 'per_round'
  //   ? tournament.meta?.roundsConfig[tournament.currentRoundPosition]?.roundTimeoutSeconds
  //   : tournament.matchTimeoutSeconds;

  return (
    <>
      <DetailsModal
        tournament={tournament}
        modalShowing={detailsModalShowing}
        setModalShowing={setDetailsModalShowing}
      />
      <StartRoundConfirmationModal
        meta={tournament.meta}
        currentRoundPosition={tournament.currentRoundPosition}
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
        currentRoundPosition={tournament.currentRoundPosition}
        redirectImmediatly={activePresentationMode}
      />
      <div className="container-fluid mb-2">
        <TournamentHeader
          id={tournament.id}
          accessToken={tournament.accessToken}
          accessType={tournament.accessType}
          breakDurationSeconds={tournament.breakDurationSeconds}
          breakState={tournament.breakState}
          currentUserId={currentUserId}
          isLive={tournament.isLive}
          isOnline={tournament.channel.online}
          isOver={isOver}
          canModerate={canModerate}
          lastRoundEndedAt={tournament.lastRoundEndedAt}
          lastRoundStartedAt={tournament.lastRoundStartedAt}
          level={tournament.level}
          matchTimeoutSeconds={tournament.matchTimeoutSeconds}
          roundTimeoutSeconds={tournament.roundTimeoutSeconds}
          name={tournament.name}
          players={tournament.players}
          playersCount={playersCount}
          playersLimit={tournament.playersLimit}
          showBots={tournament.showBots}
          hideResults={hideResults}
          startsAt={tournament.startsAt}
          state={tournament.state}
          type={tournament.type}
          handleStartRound={handleStartRound}
          handleOpenDetails={handleOpenDetails}
          toggleShowBots={toggleShowBots}
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
                hideResults={hideResults}
                canModerate={canModerate}
              />
            </div>
          </div>
          <div className="d-flex flex-column flex-lg-column-reverse col-12 col-lg-3 h-100">
            <Players
              playersCount={playersCount}
              players={tournament.players}
              showBots={tournament.showBots}
            />
            {tournament.useChat && (<TournamentChat />)}
            {tournament.useClan && (<TournamentClanTable />)}
          </div>
        </div>
      </div>
    </>
  );
}

export default TournamentAdminWidget;
