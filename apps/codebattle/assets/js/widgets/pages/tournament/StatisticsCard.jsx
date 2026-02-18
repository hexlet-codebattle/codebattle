import React, { memo } from "react";

import cn from "classnames";
import { useSelector } from "react-redux";

import { userRankingSelector } from "@/selectors";
import useMatchesStatistics from "@/utils/useMatchesStatistics";

import i18next from "../../../i18n";

import TournamentPlace from "./TournamentPlace";

function StatisticsCard({ playerId, matchList = [] }) {
  const [playerStats] = useMatchesStatistics(playerId, matchList);
  const playerRanking = useSelector(userRankingSelector(playerId));

  const cardClassName = cn(
    "d-flex flex-column justify-content-center p-2 w-100",
    "align-items-center align-items-md-baseline align-items-lg-baseline align-items-xl-baseline",
  );

  return (
    <div className={cardClassName}>
      {playerRanking?.place !== undefined && (
        <h6 title={i18next.t("Your place in tournament")} className="p-1">
          <TournamentPlace title={i18next.t("Your place")} place={playerRanking?.place} />
        </h6>
      )}
      <h6 title={i18next.t("Your score")} className="p-1">
        {`${i18next.t("Your score")}: ${playerRanking?.score}`}
      </h6>
      {/* <h6 */}
      {/*   title="Your task_ids" */}
      {/*   className="p-1" */}
      {/* > */}
      {/*   {`${i18next.t('taskIds')}: ${taskIds}`} */}
      {/* </h6> */}
      <h6 title={i18next.t("Your game played")} className="p-1">
        {`${i18next.t("Games")}: ${matchList.length}`}
      </h6>
      <h6
        title="Stats: Win games / Lost games / Canceled games"
        className="d-none d-md-block d-lg-block d-xl-block p-1"
      >
        {i18next.t("Stats: ")}
        <span className="text-success">
          {`${i18next.t("Win")} ${playerStats.winMatches.length}`}
        </span>
        {" / "}
        <span className="text-danger">
          {`${i18next.t("Lost")} ${playerStats.lostMatches.length}`}
        </span>
        {" / "}
        <span className="text-muted">
          {`${i18next.t("Timeout")} ${matchList.length - playerStats.winMatches.length - playerStats.lostMatches.length}`}
        </span>
      </h6>
      <h6 title="Stats: Win games / Lost games / Canceled games" className="d-block d-md-none p-1">
        {i18next.t("Stats: ")}
        <span className="text-success">{playerStats.winMatches.length}</span>
        {" / "}
        <span className="text-danger">{playerStats.lostMatches.length}</span>
        {" / "}
        <span className="text-muted">
          {matchList.length - playerStats.winMatches.length - playerStats.lostMatches.length}
        </span>
      </h6>
    </div>
  );
}

export default memo(StatisticsCard);
