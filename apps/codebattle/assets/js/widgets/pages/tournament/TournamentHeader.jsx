import React, { memo, useContext, useMemo } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import i18next from "i18next";
import moment from "moment";

import CustomEventStylesContext from "@/components/CustomEventStylesContext";

import CopyButton from "../../components/CopyButton";
import TournamentStates from "../../config/tournament";
import TournamentTypes from "../../config/tournamentTypes";
import useTimer from "../../utils/useTimer";

import JoinButton from "./JoinButton";
import TournamentMainControlButtons from "./TournamentMainControlButtons";
export const buildTournamentAccessUrl = (tournamentId, accessToken) => {
  const url = new URL(`/tournaments/${tournamentId}`, window.location.origin);
  url.searchParams.set("access_token", accessToken);

  return url.toString();
};

const getBadgeTitle = (state, breakState, hideResults) => {
  if (hideResults && state === TournamentStates.finished) {
    return "Waiting winner announcements";
  }

  switch (state) {
    case TournamentStates.active:
      return breakState === "off" ? "Active" : "Round break";
    case TournamentStates.waitingParticipants:
      return "Waiting Participants";
    case TournamentStates.canceled:
      return "Canceled";
    case TournamentStates.finished:
      return "Finished";
    default:
      return "Loading";
  }
};

const getDescriptionByState = (state) => {
  switch (state) {
    case TournamentStates.canceled:
      return i18next.t("The tournament is canceled");
    case TournamentStates.finished:
      return i18next.t("The tournament is finished");
    default:
      return "";
  }
};

function TournamentTimer({ startsAt, isOnline }) {
  const [duration, seconds] = useTimer(startsAt);

  if (!isOnline) {
    return null;
  }

  return seconds > 0 ? (
    <span>{i18next.t("The tournament will start: %{duration}", { duration })}</span>
  ) : (
    <span>{i18next.t("The tournament will start soon")}</span>
  );
}

export function TournamentRemainingTimer({ startsAt, duration }) {
  const endsAt = useMemo(() => moment.utc(startsAt).add(duration, "seconds"), [startsAt, duration]);
  const [time, seconds] = useTimer(endsAt);

  return seconds > 0 ? time : "";
}

function TournamentStateDescription({
  state,
  startsAt,
  breakState,
  breakDurationSeconds,
  currentRoundTimeoutSeconds,
  lastRoundStartedAt,
  lastRoundEndedAt,
  isOnline,
}) {
  if (state === TournamentStates.waitingParticipants) {
    return <TournamentTimer startsAt={startsAt} isOnline={isOnline} />;
  }

  if (state === TournamentStates.active && breakState === "off") {
    if (!Number.isInteger(currentRoundTimeoutSeconds)) {
      return null;
    }

    return (
      <span>
        {i18next.t("Round ends in ")}
        <TournamentRemainingTimer
          key={lastRoundStartedAt}
          startsAt={lastRoundStartedAt}
          duration={currentRoundTimeoutSeconds}
        />
      </span>
    );
  }

  if (state === TournamentStates.active && breakState === "on") {
    return (
      <span>
        {i18next.t("Next round will start in ")}
        <TournamentRemainingTimer
          key={lastRoundEndedAt}
          startsAt={lastRoundEndedAt}
          duration={breakDurationSeconds}
        />
      </span>
    );
  }

  return getDescriptionByState(state);
}

function TournamentHeader({
  id: tournamentId,
  state,
  streamMode,
  breakState,
  breakDurationSeconds,
  currentRoundTimeoutSeconds,
  lastRoundStartedAt,
  lastRoundEndedAt,
  startsAt,
  type,
  accessType,
  accessToken,
  isLive,
  name,
  players,
  playersCount,
  currentUserId,
  showBots = true,
  hideResults = true,
  isOnline,
  isOver,
  canModerate,
  toggleShowBots,
  toggleStreamMode,
  handleStartRound,
  handleOpenDetails,
  showHeaderPane = true,
  showAdminPane = true,
}) {
  const stateBadgeTitle = useMemo(
    () => i18next.t(getBadgeTitle(state, breakState, hideResults)),
    [state, breakState, hideResults],
  );
  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const stateClassName = cn(
    "badge mr-2",
    hasCustomEventStyle
      ? {
          "cb-custom-event-badge-warning": state === TournamentStates.waitingParticipants,
          "cb-custom-event-badge-success":
            !hideResults && (breakState === "off" || state === TournamentStates.finished),
          "cb-custom-event-badge-light": state === TournamentStates.canceled,
          "cb-custom-event-badge-danger": breakState === "on",
          "cb-custom-event-badge-primary": hideResults && state === TournamentStates.finished,
        }
      : {
          "badge-warning": state === TournamentStates.waitingParticipants,
          "badge-success":
            !hideResults && (breakState === "off" || state === TournamentStates.finished),
          "badge-light": state === TournamentStates.canceled,
          "badge-danger": breakState === "on",
          "badge-primary": hideResults && state === TournamentStates.finished,
        },
  );
  const copyBtnClassName = cn("btn btn-sm rounded-right", {
    "btn-secondary cb-btn-secondary": !hasCustomEventStyle,
    "cb-custom-event-btn-secondary": hasCustomEventStyle,
  });
  // const backBtnClassName = cn('btn rounded-lg ml-lg-2 mr-2', {
  //   'btn-primary': !hasCustomEventStyle,
  //   'cb-custom-event-btn-primary': hasCustomEventStyle,
  // });

  const canStart = isLive && state === TournamentStates.waitingParticipants && playersCount > 0;
  const canStartRound = isLive && state === TournamentStates.active && breakState === "on";
  const canFinishRound = isLive && state === TournamentStates.active && breakState === "off";
  const canFinishTournament = state === TournamentStates.active;
  const canRestart =
    !isLive ||
    state === TournamentStates.active ||
    state === TournamentStates.finished ||
    state === TournamentStates.canceled;
  const canToggleShowBots = type === TournamentTypes.show;
  const tournamentAccessUrl = useMemo(
    () => buildTournamentAccessUrl(tournamentId, accessToken),
    [tournamentId, accessToken],
  );
  const showDeadTournamentWarning = canModerate && !isLive;
  const showAdminJoinButton =
    canModerate && [TournamentStates.waitingParticipants, TournamentStates.active].includes(state);
  const showAdminPanel = canModerate && showAdminPane;

  return (
    <>
      {showHeaderPane && (
        <div className="cb-bg-panel shadow-sm cb-rounded p-3 mb-2">
          <div className="d-flex flex-column">
            <div className="d-flex align-items-center mb-3">
              <div className="d-flex flex-column">
                <h2
                  title={name}
                  className="pb-1 m-0 text-capitalize text-nowrap cb-overflow-x-auto cb-overflow-y-hidden"
                >
                  {name}
                </h2>
              </div>
              {accessType === "token" && (
                <div title="Private tournament" className="text-center ml-2">
                  <FontAwesomeIcon icon="lock" />
                </div>
              )}
            </div>
            <div className="d-flex align-items-center flex-wrap overflow-auto">
              <span className={stateClassName}>{stateBadgeTitle}</span>
              <span className="h6 mb-0 text-nowrap">
                <TournamentStateDescription
                  state={state}
                  startsAt={startsAt}
                  breakState={breakState}
                  breakDurationSeconds={breakDurationSeconds}
                  currentRoundTimeoutSeconds={currentRoundTimeoutSeconds}
                  lastRoundStartedAt={lastRoundStartedAt}
                  lastRoundEndedAt={lastRoundEndedAt}
                  isLive={isLive}
                  isOver={isOver}
                  isOnline={isOnline}
                />
              </span>
            </div>
          </div>
        </div>
      )}
      {showAdminPanel && (
        <div className="cb-bg-panel shadow-sm cb-rounded p-3 mb-2 overflow-auto">
          <div className="d-flex flex-column">
            <div className="d-flex flex-column flex-lg-row align-items-lg-start">
              {showAdminJoinButton && (
                <div className="mb-3 mb-lg-0 mr-lg-3">
                  <JoinButton
                    isShow
                    isShowLeave={state === TournamentStates.waitingParticipants}
                    isParticipant={!!players[currentUserId]}
                    disabled={!isOnline}
                  />
                </div>
              )}
              {canModerate && (
                <div className="flex-grow-1">
                  <TournamentMainControlButtons
                    accessType={accessType}
                    streamMode={streamMode}
                    tournamentId={tournamentId}
                    canStart={canStart}
                    canStartRound={canStartRound}
                    canFinishRound={canFinishRound}
                    canFinishTournament={canFinishTournament}
                    canRestart={canRestart}
                    canToggleShowBots={canToggleShowBots}
                    showBots={showBots}
                    hideResults={hideResults}
                    disabled={!isOnline}
                    handleStartRound={handleStartRound}
                    handleOpenDetails={handleOpenDetails}
                    toggleShowBots={toggleShowBots}
                    toggleStreamMode={toggleStreamMode}
                  />
                </div>
              )}
            </div>
            {canModerate && !streamMode && accessType === "token" && (
              <div
                className={cn(
                  "d-flex justify-content-end mt-2 pt-2",
                  "cb-grid-divider overflow-auto border-top cb-border-color",
                )}
              >
                <div className="d-flex input-group">
                  <div title="Access token" className="input-group-prepend">
                    <span className="input-group-text cb-bg-highlight-panel cb-border-color cb-text">
                      <FontAwesomeIcon icon="key" />
                    </span>
                  </div>
                  <CopyButton
                    className={copyBtnClassName}
                    value={tournamentAccessUrl}
                    disabled={!isLive || !isOnline}
                  />
                </div>
              </div>
            )}
            {showDeadTournamentWarning && (
              <div
                className={cn(
                  "mt-2 px-3 py-2 rounded small font-weight-bold border",
                  hasCustomEventStyle
                    ? "cb-bg-highlight-panel cb-border-color cb-text"
                    : "border-warning text-warning",
                )}
              >
                {i18next.t(
                  "Tournament process is dead. Click Restart to make it live again so users can join.",
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default memo(TournamentHeader);
