import React, { memo } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import i18next from "i18next";
import moment from "moment";
import Tooltip from "react-bootstrap/Tooltip";
import { useSelector } from "react-redux";

import OverlayTrigger from "@/components/OverlayTriggerCompat";
import useMatchesStatistics from "@/utils/useMatchesStatistics";

import Loading from "../../components/Loading";
import UserInfo from "../../components/UserInfo";

import MatchAction from "./MatchAction";
import TournamentMatchBadge from "./TournamentMatchBadge";

export const toLocalTime = (time) => moment.utc(time).local().format("HH:mm:ss");

const matchClassName = cn(
  "d-flex flex-column flex-lg-row align-items-lg-center justify-content-between",
  "border-bottom cb-border-color px-3 py-3",
);
const matchBodyClassName = cn(
  "d-flex flex-column flex-lg-row flex-lg-wrap align-items-start align-items-lg-center flex-grow-1",
);
const matchHeaderClassName = cn("d-flex align-items-center mb-2 mb-lg-0");
const matchPlayersClassName = cn("d-flex flex-wrap align-items-center mb-1 mb-lg-0");
const playerSlotClassName = cn("d-flex align-items-center text-nowrap");
const matchMetaClassName = cn(
  "d-flex flex-wrap align-items-center text-nowrap small",
  "mt-1 mt-lg-0 ml-lg-auto",
);
const metaItemClassName = "d-inline-flex align-items-center mr-3";
const metaIconClassName = "d-inline-flex align-items-center justify-content-center mr-2";
const actionClassName = cn(
  "d-flex justify-content-start justify-content-lg-center align-items-center",
  "mt-3 mt-lg-0 ml-lg-3",
);
const roundBadgeClassName = cn(
  "cb-text text-nowrap d-inline-flex align-items-center justify-content-center mr-2 small font-weight-bold",
);
const resultBadgeWrapClassName = "d-inline-flex align-items-center justify-content-start";

const orderMatchPlayerIds = (playerIds, playerId) => {
  if (!playerIds.includes(playerId)) {
    return playerIds;
  }

  return [playerId, ...playerIds.filter((id) => id !== playerId)];
};

function UserTournamentInfo({ userId }) {
  const user = useSelector((state) => state.tournament.players[userId]);

  if (!user) {
    return <Loading adaptive />;
  }

  return <UserInfo user={user} hideOnlineIndicator hideLink />;
}

function MatchPlayer({ userId }) {
  return (
    <div className={playerSlotClassName}>
      <UserTournamentInfo userId={userId} />
    </div>
  );
}

function UsersMatchList({
  currentUserId,
  playerId,
  canModerate,
  matches,
  hideStats = false,
  hideBots = false,
}) {
  const [player] = useMatchesStatistics(playerId, matches);

  if (matches.length === 0) {
    return (
      <div className="d-flex flex-colum justify-content-center align-items-center p-2">
        No Matches Yet
      </div>
    );
  }

  return (
    <div className="d-flex flex-column">
      {!hideStats && matches.length > 0 && (
        <div className="d-flex py-2 border-bottom cb-border-color align-items-center overflow-auto">
          <span className="ml-2">
            {"Wins: "}
            {player.winMatches.length}
          </span>
          <span className="ml-1 pl-1 border-left cb-border-color">
            {"AVG Tests: "}
            {Math.ceil(player.avgTests)}%
          </span>
          <span className="ml-1 pl-1 border-left cb-border-color">
            {"AVG Duration: "}
            {Math.ceil(player.avgDuration)}
            {" sec"}
          </span>
        </div>
      )}
      {matches.map((match) => {
        const currentUserIsPlayer =
          currentUserId === match.playerIds[0] || currentUserId === match.playerIds[1];
        const isWinner = playerId === match.winnerId;
        const visiblePlayerIds = hideBots
          ? match.playerIds.filter((id) => id >= 0)
          : match.playerIds;
        const matchPlayerIds = orderMatchPlayerIds(visiblePlayerIds, playerId);
        const matchResult = match.playerResults[playerId];

        return (
          <div key={match.id} className={matchClassName}>
            <div className={matchBodyClassName}>
              <div className={matchHeaderClassName}>
                <span className={roundBadgeClassName} style={{ minWidth: 56 }}>
                  {`R${(match.roundPosition ?? 0) + 1}`}
                </span>
                <span className={resultBadgeWrapClassName} style={{ minWidth: 112 }}>
                  <TournamentMatchBadge
                    matchState={match.state}
                    isWinner={isWinner}
                    currentUserIsPlayer={currentUserIsPlayer}
                  />
                </span>
              </div>
              <div className={matchPlayersClassName}>
                {matchPlayerIds.length >= 1 && <MatchPlayer userId={matchPlayerIds[0]} />}
                {matchPlayerIds.length >= 2 && (
                  <>
                    <span className="mx-3 px-1 text-uppercase small cb-text">VS</span>
                    <MatchPlayer userId={matchPlayerIds[1]} />
                  </>
                )}
              </div>
              {matchResult && matchResult.result !== "undefined" && (
                <div className={matchMetaClassName}>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`tests-${match.id}`}>{i18next.t("Tests percent")}</Tooltip>
                    }
                  >
                    <span className={metaItemClassName} style={{ minWidth: 48 }}>
                      <span className={metaIconClassName}>
                        <FontAwesomeIcon className="text-success" icon="tasks" />
                      </span>
                      {matchResult.resultPercent}
                    </span>
                  </OverlayTrigger>
                  {Number.isFinite(match.durationSec) && (
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id={`duration-${match.id}`}>{i18next.t("Duration (sec)")}</Tooltip>
                      }
                    >
                      <span className={metaItemClassName} style={{ minWidth: 56 }}>
                        <span className={metaIconClassName}>
                          <FontAwesomeIcon className="text-primary" icon="stopwatch" />
                        </span>
                        {match.durationSec}
                      </span>
                    </OverlayTrigger>
                  )}
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`time-${match.id}`}>{i18next.t("Started - Finished")}</Tooltip>
                    }
                  >
                    <span className={metaItemClassName}>
                      <span className={metaIconClassName}>
                        <FontAwesomeIcon className="text-primary" icon="flag-checkered" />
                      </span>
                      {match.startedAt ? toLocalTime(match.startedAt) : "-"}
                      <span className="mx-1">-</span>
                      {match.finishedAt ? toLocalTime(match.finishedAt) : "-"}
                    </span>
                  </OverlayTrigger>
                </div>
              )}
            </div>
            <div className={actionClassName}>
              <MatchAction
                match={match}
                canModerate={canModerate}
                currentUserIsPlayer={currentUserIsPlayer}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(UsersMatchList);
