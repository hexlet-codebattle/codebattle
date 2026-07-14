import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import { type IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import i18next from 'i18next';
import Markdown from 'react-markdown';
import { useDispatch, useSelector } from 'react-redux';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import TournamentStates from '../../config/tournament';
import { type TournamentState } from '../../slices/initial';
import { type RootState, type AppDispatch } from '../../slices/store';
import { connectToChat } from '../../middlewares/Chat';
import { connectToTournament, joinTournament } from '../../middlewares/Tournament';
import { connectToTournament as connectToTournamentAdmin } from '../../middlewares/TournamentAdmin';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import useSearchParams from '../../utils/useSearchParams';

import CustomTournamentInfoPanel from './CustomTournamentInfoPanel';
import DetailsModal from './DetailsModal';
import JoinButton from './JoinButton';
import MatchConfirmationModal from './MatchConfirmationModal';
import PlayersRankingPanel from './PlayersRankingPanel';
import StartRoundConfirmationModal from './StartRoundConfirmationModal';
import TournamentChat from './TournamentChat';
import TournamentClanTable from './TournamentClanTable';
import TournamentHeader from './TournamentHeader';

// The tournament redux state is intentionally loosely typed (Record with an index
// signature), so this container reads its many optional fields pragmatically.
type TournamentData = Record<string, any>;

const getTournamentPresentationStatus = (state: string) => {
  switch (state) {
    case TournamentStates.finished:
      return 'Tournament finished';
    default:
      return 'Waiting';
  }
};

const capitalize = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

interface JoinMetaItem {
  icon: string;
  label: string;
  value: React.ReactNode;
}

interface TournamentJoinPanelProps {
  tournament: TournamentData;
  isParticipant: boolean;
  isOnline?: boolean;
  showLeave?: boolean;
}

function TournamentJoinPanel({
  tournament,
  isParticipant,
  isOnline,
  showLeave,
}: TournamentJoinPanelProps) {
  const isActive = tournament.state === TournamentStates.active;

  const headline = isParticipant
    ? i18next.t("You're in — get ready to battle!")
    : isActive
      ? i18next.t('Tournament in progress')
      : i18next.t('Registration is open');

  const subtitle = isParticipant
    ? i18next.t('You are registered for this tournament. You can leave before it starts.')
    : isActive
      ? i18next.t('This tournament is live — join now to jump into the next round.')
      : i18next.t('Join this tournament to take part in the matches.');

  const matchMinutes = tournament.matchTimeoutSeconds
    ? Math.max(1, Math.round(tournament.matchTimeoutSeconds / 60))
    : undefined;

  const meta: JoinMetaItem[] = [
    {
      icon: 'users',
      label: i18next.t('Players'),
      value:
        tournament.playersCount != null
          ? `${tournament.playersCount}${tournament.playersLimit ? `/${tournament.playersLimit}` : ''}`
          : undefined,
    },
    {
      icon: 'layer-group',
      label: i18next.t('Rounds'),
      value: tournament.roundsLimit ? tournament.roundsLimit : undefined,
    },
    {
      icon: 'sitemap',
      label: i18next.t('Format'),
      value: capitalize(tournament.type),
    },
    {
      icon: 'stopwatch',
      label: i18next.t('Match time'),
      value: matchMinutes ? i18next.t('%{count} min', { count: matchMinutes }) : undefined,
    },
    {
      icon: 'signal',
      label: i18next.t('Level'),
      value: capitalize(tournament.level),
    },
  ].filter((item) => item.value != null && item.value !== '');

  return (
    <div className="cb-join-hero text-white">
      <div className="cb-join-hero-head">
        <span className="cb-join-hero-icon">
          <FontAwesomeIcon icon="trophy" />
        </span>
        <div className="min-w-0">
          <h3 className="cb-join-hero-title">{headline}</h3>
          <p className="cb-join-hero-subtitle">{subtitle}</p>
        </div>
      </div>
      {meta.length > 0 && (
        <div className="cb-join-meta">
          {meta.map((item) => (
            <div key={item.label} className="cb-join-meta-item">
              <FontAwesomeIcon className="cb-join-meta-icon" icon={item.icon as IconProp} />
              <span className="cb-join-meta-text">
                <span className="cb-join-meta-value">{item.value}</span>
                <span className="cb-join-meta-label">{item.label}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className={cn('cb-join-actions', { 'cb-join-primary-btn': !isParticipant })}>
        <JoinButton
          isShow
          isShowLeave={showLeave}
          isParticipant={isParticipant}
          disabled={!isOnline}
        />
      </div>
      {tournament.description && (
        <div className="cb-join-description">
          <Markdown>{tournament.description}</Markdown>
        </div>
      )}
    </div>
  );
}

interface InfoPanelProps {
  currentUserId: number;
  tournament: TournamentData;
  hideResults?: boolean;
  canModerate?: boolean;
  isOnline?: boolean;
  playersCount?: number;
}

function InfoPanel({
  currentUserId,
  tournament,
  hideResults,
  canModerate,
  isOnline,
}: InfoPanelProps) {
  const showJoinCta = [TournamentStates.waitingParticipants, TournamentStates.active].includes(
    tournament.state,
  );
  const isParticipant = !!tournament.players[currentUserId];

  const joinCta =
    showJoinCta && !canModerate ? (
      <div className="mb-3 pb-2 border-bottom cb-border-color">
        <p className="mb-2 text-muted">
          {isParticipant
            ? i18next.t('You are registered for this tournament. You can leave before it starts.')
            : i18next.t('Join this tournament to take part in the matches.')}
        </p>
        <JoinButton
          isShow
          isShowLeave={tournament.state === TournamentStates.waitingParticipants}
          isParticipant={isParticipant}
          disabled={!isOnline}
        />
      </div>
    ) : null;

  if (tournament.state === TournamentStates.waitingParticipants) {
    if (canModerate) {
      return (
        <div className="h-100 text-white">
          <Markdown>{tournament.description}</Markdown>
        </div>
      );
    }

    return (
      <TournamentJoinPanel
        tournament={tournament}
        isParticipant={isParticipant}
        isOnline={isOnline}
        showLeave
      />
    );
  }

  if (tournament.state === TournamentStates.active && !isParticipant && !canModerate) {
    return (
      <TournamentJoinPanel
        tournament={tournament}
        isParticipant={false}
        isOnline={isOnline}
        showLeave={false}
      />
    );
  }

  if (isEmpty(tournament.players)) return <></>;

  return (
    <>
      {!isParticipant && joinCta}
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
        type={tournament.type}
        playersRedirectUrl={tournament.meta?.playersRedirectUrl}
        hideCustomGameConsole={
          tournament.type !== 'versus' || tournament.state !== TournamentStates.active
        }
      />
    </>
  );
}

function Tournament() {
  const dispatch = useDispatch<AppDispatch>();

  const searchParams = useSearchParams();

  const activePresentationMode = searchParams.has('presentation');
  const activeStreamMode = searchParams.has('stream');

  const streamMode = useSelector((state: RootState) => state.gameUI.streamMode);
  // The selector yields `number | null`, but the guest case is handled separately and the
  // child panels are wired to expect a concrete id, matching the original JS behavior.
  const currentUserId = useSelector(selectors.currentUserIdSelector) as number;
  const canModerateTournament = useSelector(selectors.currentUserCanModerateTournament);
  const isGuest = useSelector(selectors.currentUserIsGuestSelector);
  const tournament = useSelector(selectors.tournamentSelector) as TournamentData;

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
  const canModerate = useMemo(() => {
    if (!currentUserId) {
      return false;
    }

    return canModerateTournament || (tournament.moderatorIds || []).includes(currentUserId);
  }, [currentUserId, canModerateTournament, tournament.moderatorIds]);
  const hiddenSidePanel =
    streamMode ||
    (tournament.state === TournamentStates.finished && !tournament.useChat && !tournament.useClan);

  const panelClassName = cn('mb-2', {
    'container-fluid': !streamMode,
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
      document.body.style.zoom = '100%';
    }
    dispatch(actions.toggleStreamMode());
  }, [dispatch, streamMode]);
  const handleStartRound = useCallback(setStartRoundConfirmationModalShowing, [
    setStartRoundConfirmationModalShowing,
  ]);

  useEffect(() => {
    const tournamentChannel = dispatch(connectToTournament(tournament?.id));

    return () => {
      tournamentChannel.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoJoinAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoJoinAttemptedRef.current) return;
    if (!searchParams.has('auto_join')) return;
    if (!tournament?.channel?.online) return;
    if (!tournament?.id || !currentUserId || isGuest) return;
    const joinable = [TournamentStates.waitingParticipants, TournamentStates.active].includes(
      tournament.state,
    );
    if (!joinable) return;
    if (tournament.players && tournament.players[currentUserId]) {
      autoJoinAttemptedRef.current = true;
      return;
    }

    autoJoinAttemptedRef.current = true;
    joinTournament();

    const url = new URL(window.location.href);
    url.searchParams.delete('auto_join');
    window.history.replaceState({}, '', url.toString());
  }, [
    tournament?.id,
    tournament.state,
    tournament?.channel?.online,
    tournament.players,
    currentUserId,
    isGuest,
    searchParams,
  ]);

  useEffect(() => {
    if (!canModerate) {
      return undefined;
    }

    const tournamentAdminChannel = dispatch(connectToTournamentAdmin(tournament?.id, true));

    return () => {
      tournamentAdminChannel.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canModerate]);

  useEffect(() => {
    if (tournament.isLive) {
      const channel = connectToChat(tournament.useChat, 'channel')(dispatch);
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
      document.body.style.zoom = '130%';
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
          tournament={tournament as unknown as TournamentState}
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
          {hiddenSidePanel && (
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
              grade={tournament.grade}
              currentRoundTimeoutSeconds={tournament.currentRoundTimeoutSeconds}
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
              showHeaderPane
              showAdminPane={false}
            />
          )}
          <div className="row flex-lg-row-reverse">
            <div
              className={cn('col-12 mb-2 mb-lg-0', {
                'col-lg-8': !hiddenSidePanel,
              })}
            >
              {canModerate && (
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
                  grade={tournament.grade}
                  currentRoundTimeoutSeconds={tournament.currentRoundTimeoutSeconds}
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
                  showHeaderPane={false}
                  showAdminPane
                />
              )}
              <div className="cb-bg-panel h-100 shadow-sm cb-rounded p-3 overflow-auto">
                <InfoPanel
                  tournament={tournament}
                  playersCount={tournament.playersCount}
                  currentUserId={currentUserId}
                  hideResults={hideResults}
                  canModerate={canModerate}
                  isOnline={tournament.channel?.online ?? false}
                />
              </div>
            </div>
            {!hiddenSidePanel && (
              <div className="d-flex flex-column col-12 col-lg-4 h-100">
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
                  grade={tournament.grade}
                  currentRoundTimeoutSeconds={tournament.currentRoundTimeoutSeconds}
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
                  showHeaderPane
                  showAdminPane={false}
                />
                {tournament.useChat && <TournamentChat />}
                {tournament.useClan && <TournamentClanTable />}
                {tournament.state !== TournamentStates.finished && !tournament.useClan && (
                  <PlayersRankingPanel
                    canModerate={canModerate}
                    playersCount={tournament.playersCount}
                    ranking={tournament.ranking}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </>
    </CustomEventStylesContext.Provider>
  );
}

export default Tournament;
