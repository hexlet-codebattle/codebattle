import React, { useState, useCallback, useEffect, useMemo } from "react";

import cn from "classnames";
import has from "lodash/has";
import isEmpty from "lodash/isEmpty";
import Markdown from "react-markdown";
import { useDispatch, useSelector } from "react-redux";

import CustomEventStylesContext from "../../components/CustomEventStylesContext";
import TournamentStates from "../../config/tournament";
import { connectToChat } from "../../middlewares/Chat";
import { connectToTournament } from "../../middlewares/Tournament";
import { connectToTournament as connectToTournamentAdmin } from "../../middlewares/TournamentAdmin";
import * as selectors from "../../selectors";
import { actions } from "../../slices";
import useSearchParams from "../../utils/useSearchParams";

import CustomTournamentInfoPanel from "./CustomTournamentInfoPanel";
import DetailsModal from "./DetailsModal";
import IndividualMatches from "./IndividualMatches";
import JoinButton from "./JoinButton";
import MatchConfirmationModal from "./MatchConfirmationModal";
import PlayersRankingPanel from "./PlayersRankingPanel";
import StartRoundConfirmationModal from "./StartRoundConfirmationModal";
import TournamentChat from "./TournamentChat";
import TournamentClanTable from "./TournamentClanTable";
import TournamentHeader from "./TournamentHeader";

const getTournamentPresentationStatus = (state) => {
  switch (state) {
    case TournamentStates.finished:
      return "Tournament finished";
    default:
      return "Waiting";
  }
};

function InfoPanel({ currentUserId, tournament, hideResults, canModerate }) {
  if (tournament.state === TournamentStates.waitingParticipants && tournament.type !== "team") {
    return (
      <div className="h-100">
        <Markdown>{tournament.description}</Markdown>
      </div>
    );
  }

  switch (tournament.type) {
    case "individual":
      return (
        <IndividualMatches
          matches={tournament.matches}
          players={tournament.players}
          playersCount={tournament.playersCount}
          currentUserId={currentUserId}
        />
      );
    default: {
      if (isEmpty(tournament.players)) return <></>;

      return (
        <CustomTournamentInfoPanel
          canModerate={canModerate}
          currentRoundPosition={tournament.currentRoundPosition}
          currentUserId={currentUserId}
          hideBots={!tournament.showBots}
          hideResults={hideResults}
          matchTimeoutSeconds={tournament.matchTimeoutSeconds}
          matches={tournament.matches}
          pageNumber={tournament.playersPageNumber}
          pageSize={tournament.playersPageSize}
          players={tournament.players}
          playersCount={tournament.playersCount}
          ranking={tournament.ranking}
          roundsLimit={tournament.roundsLimit}
          state={tournament.state}
          taskList={tournament.taskList}
          topPlayerIds={tournament.topPlayerIds}
          tournamentId={tournament.id}
          type={tournament.type}
          hideCustomGameConsole={
            tournament.type !== "versus" || tournament.state !== TournamentStates.active
          }
        />
      );
    }
  }
}

function Tournament() {
  const dispatch = useDispatch();

  const searchParams = useSearchParams();

  const activePresentationMode = searchParams.has("presentation");
  const activeStreamMode = searchParams.has("stream");

  const streamMode = useSelector((state) => state.gameUI.streamMode);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isOwner = useSelector(selectors.currentUserIsTournamentOwnerSelector);
  const isGuest = useSelector(selectors.currentUserIsGuestSelector);
  const tournament = useSelector(selectors.tournamentSelector);

  const hasCustomEventStyles = !!tournament.eventId;

  const hideResults = tournament.showResults === undefined ? false : !tournament.showResults;

  const [detailsModalShowing, setDetailsModalShowing] = useState(false);
  const [startRoundConfirmationModalShowing, setStartRoundConfirmationModalShowing] =
    useState(false);
  const [matchConfirmationModalShowing, setMatchConfirmationModalShowing] = useState(false);

  const isOver = useMemo(
    () => [TournamentStates.finished, TournamentStates.canceled].includes(tournament.state),
    [tournament.state],
  );
  const canModerate = useMemo(() => isOwner || isAdmin, [isOwner, isAdmin]);
  const hiddenSidePanel =
    streamMode ||
    (tournament.state === TournamentStates.finished && !tournament.useChat && !tournament.useClan);

  const panelClassName = cn("mb-2", {
    "container-fluid": !streamMode,
  });

  const handleOpenDetails = useCallback(() => {
    setDetailsModalShowing(true);
  }, [setDetailsModalShowing]);
  const onCloseRoundConfirmationModal = useCallback(() => {
    setStartRoundConfirmationModalShowing(false);
  }, [setStartRoundConfirmationModalShowing]);
  const toggleShowBots = useCallback(() => {
    dispatch(actions.toggleShowBots());
  }, [dispatch]);
  const toggleStreamMode = useCallback(() => {
    if (streamMode) {
      // document.getElementsByTagName('main')[0].style.zoom = '100%';
      document.body.style.zoom = "100%";
    }
    dispatch(actions.toggleStreamMode());
  }, [dispatch, streamMode]);
  const handleStartRound = useCallback(setStartRoundConfirmationModalShowing, [
    setStartRoundConfirmationModalShowing,
  ]);

  useEffect(() => {
    const tournamentChannel = dispatch(connectToTournament(tournament?.id));

    if (canModerate) {
      const tournamentAdminChannel = dispatch(connectToTournamentAdmin(tournament?.id, true));

      return () => {
        tournamentChannel.leave();
        tournamentAdminChannel.leave();
      };
    }

    return () => {
      tournamentChannel.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canModerate]);

  useEffect(() => {
    if (tournament.isLive) {
      const channel = connectToChat(tournament.useChat, "channel")(dispatch);
      return () => {
        if (channel) {
          channel.leave();
        }
      };
    }

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.isLive]);

  useEffect(() => {
    if (matchConfirmationModalShowing) {
      setDetailsModalShowing(false);
      setStartRoundConfirmationModalShowing(false);
    }
  }, [
    matchConfirmationModalShowing,
    setStartRoundConfirmationModalShowing,
    setDetailsModalShowing,
  ]);

  useEffect(() => {
    if (activeStreamMode && !streamMode) {
      toggleStreamMode();
    }

    if (activeStreamMode || streamMode) {
      // document.getElementsByTagName('main')[0].style.zoom = '130%';
      document.body.style.zoom = "130%";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="d-flex flex-column justify-content-center align-items-center p-3">
          {has(tournament.players, currentUserId) ||
          tournament.state !== TournamentStates.waitingParticipants ? (
            <span className="h3">{getTournamentPresentationStatus(tournament.state)}</span>
          ) : (
            <>
              <span className="h3">{tournament.name}</span>
              <div className="d-flex">
                <JoinButton isShow isParticipant={false} />
              </div>
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
            Please <a href="/session/new">sign in</a> to see the tournament details
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
    <CustomEventStylesContext.Provider value={hasCustomEventStyles}>
      <>
        <DetailsModal
          tournament={tournament}
          modalShowing={detailsModalShowing}
          setModalShowing={setDetailsModalShowing}
        />
        <StartRoundConfirmationModal
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
        <div className={panelClassName}>
          <TournamentHeader
            id={tournament.id}
            streamMode={streamMode}
            accessToken={tournament.accessToken}
            accessType={tournament.accessType}
            breakDurationSeconds={tournament.breakDurationSeconds}
            breakState={tournament.breakState}
            currentUserId={currentUserId}
            isLive={tournament.isLive}
            isOnline={tournament.channel?.online ?? false}
            isOver={isOver}
            canModerate={canModerate}
            lastRoundEndedAt={tournament.lastRoundEndedAt}
            lastRoundStartedAt={tournament.lastRoundStartedAt}
            level={tournament.level}
            matchTimeoutSeconds={tournament.matchTimeoutSeconds}
            roundTimeoutSeconds={tournament.roundTimeoutSeconds}
            name={tournament.name}
            players={tournament.players}
            playersCount={tournament.playersCount}
            playersLimit={tournament.playersLimit}
            showBots={tournament.showBots}
            hideResults={hideResults}
            startsAt={tournament.startsAt}
            state={tournament.state}
            type={tournament.type}
            handleStartRound={handleStartRound}
            handleOpenDetails={handleOpenDetails}
            toggleShowBots={toggleShowBots}
            toggleStreamMode={toggleStreamMode}
          />
        </div>
        <div className={panelClassName}>
          <div className="row flex-lg-row-reverse">
            <div
              className={cn("col-12 mb-2 mb-lg-0", {
                "col-lg-8": !hiddenSidePanel,
              })}
            >
              <div className="cb-bg-panel h-100 shadow-sm cb-rounded p-3 overflow-auto">
                <InfoPanel
                  tournament={tournament}
                  playersCount={tournament.playersCount}
                  currentUserId={currentUserId}
                  hideResults={hideResults}
                  canModerate={canModerate}
                />
              </div>
            </div>
            <div className="d-flex flex-column flex-lg-column-reverse col-12 col-lg-4 h-100">
              {tournament.state !== TournamentStates.finished &&
                !tournament.useClan &&
                !hiddenSidePanel && (
                  <PlayersRankingPanel
                    playersCount={tournament.playersCount}
                    ranking={tournament.ranking}
                  />
                )}
              {tournament.useChat && !hiddenSidePanel && <TournamentChat />}
              {tournament.useClan && !hiddenSidePanel && <TournamentClanTable />}
            </div>
          </div>
        </div>
      </>
    </CustomEventStylesContext.Provider>
  );
}

export default Tournament;
