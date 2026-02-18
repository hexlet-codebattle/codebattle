import React, { memo, useContext, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import { useDispatch } from "react-redux";

import CustomEventStylesContext from "@/components/CustomEventStylesContext";
import { uploadPlayers } from "@/middlewares/Tournament";

import i18next from "../../../i18n";
import MatchStateCodes from "../../config/matchStates";
import {
  getCustomEventPlayerDefaultImgUrl,
  tournamentEmptyPlayerUrl,
} from "../../utils/urlBuilders";
import useMatchesStatistics from "../../utils/useMatchesStatistics";

function StageStatus({ playerId, matchList, matchState }) {
  const [player, opponent] = useMatchesStatistics(playerId, matchList);

  if (matchState === MatchStateCodes.playing) {
    return <span className="text-primary">{i18next.t("Active match")}</span>;
  }

  if (
    player.winMatches.length === opponent.winMatches.length &&
    player.score === opponent.score &&
    player.avgTests === opponent.avgTests &&
    player.avgDuration === opponent.avgDuration
  ) {
    return <span className="text-secondary">{i18next.t("Draw")}</span>;
  }

  if (
    player.score > opponent.score ||
    (player.score === opponent.score && player.winMatches.length > opponent.winMatches.length) ||
    (player.winMatches.length === opponent.winMatches.length &&
      player.score === opponent.score &&
      player.avgTests > opponent.avgTests) ||
    (player.winMatches.length === opponent.winMatches.length &&
      player.score === opponent.score &&
      player.avgTests === opponent.avgTests &&
      player.avgDuration > opponent.avgDuration)
  ) {
    return <span className="text-success">{i18next.t("You win")}</span>;
  }

  return <span className="text-danger">{i18next.t("You lose")}</span>;
}

function StageCard({
  playerId,
  opponentId,
  // stage,
  // stagesLimit,
  players,
  lastGameId,
  lastMatchState,
  matchList,
  isBanned,
}) {
  const dispatch = useDispatch();
  const opponent = players[opponentId];

  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const cardInfoClassName = cn(
    "d-flex flex-column justify-content-center pl-0 pl-md-3 pl-lg-3 pl-xl-3",
    "align-items-center align-items-md-baseline align-items-lg-baseline align-items-xl-baseline",
  );

  const bunnedBtnClassName = cn("btn rounded-lg m-1 px-4 disabled", {
    "btn-danger": !hasCustomEventStyle,
    "cb-custom-event-btn-danger": hasCustomEventStyle,
  });
  const openBtnClassName = cn("btn rounded-lg m-1 px-4", {
    "btn-secondary cb-btn-secondary": !hasCustomEventStyle,
    "cb-custom-event-btn-primary": hasCustomEventStyle,
  });

  useEffect(() => {
    if (!opponent && opponentId) {
      dispatch(uploadPlayers([opponentId]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="d-flex flex-column flex-md-row flex-lg-row flex-xl-row p-2 w-100">
      {opponent ? (
        <>
          <img
            alt={`${opponent.name} avatar`}
            src={
              opponent.avatarUrl ||
              getCustomEventPlayerDefaultImgUrl(opponent) ||
              tournamentEmptyPlayerUrl
            }
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar rounded p-2"
          />
          <div className={cardInfoClassName}>
            <h6 className="cb-custom-event-name p-1" style={{ maxWidth: 300 }}>
              {`${i18next.t("Opponent")}: ${opponent.name}`}
            </h6>
            {opponent.clanId && (
              <h6 className="cb-custom-event-name p-1" style={{ maxWidth: 250 }}>
                {`${i18next.t("Opponent clan")}: ${opponent.clan}`}
              </h6>
            )}
            <h6 className="p-1">
              {`${i18next.t("Status")}: `}
              <StageStatus playerId={playerId} matchList={matchList} matchState={lastMatchState} />
            </h6>
            <div className="d-flex">
              {isBanned ? (
                <a href="_blank" className={bunnedBtnClassName}>
                  <FontAwesomeIcon className="mr-2" icon="ban" />
                  {i18next.t("You banned")}
                </a>
              ) : (
                <a href={`/games/${lastGameId}`} className={openBtnClassName}>
                  <FontAwesomeIcon className="mr-2" icon="eye" />
                  {i18next.t("Open match")}
                </a>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <img
            alt="Waiting opponent avatar"
            src={tournamentEmptyPlayerUrl}
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar bg-gray rounded p-3"
          />
          <div className="d-flex flex-column justify-content-center pl-0 pl-md-3 pl-lg-3 pl-xl-3">
            <h6 className="p-1">{`${i18next.t("Opponent")}: ?`}</h6>
            <h6 className="p-1">
              {`${i18next.t("Status")}: `}
              <span className="cb-tournament-status">{i18next.t("Waiting")}</span>
            </h6>
            <h6 className="p-1 text-muted">{i18next.t("Wait round starts")}</h6>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(StageCard);
