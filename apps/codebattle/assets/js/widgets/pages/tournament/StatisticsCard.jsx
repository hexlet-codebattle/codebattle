import React, { memo, useMemo } from "react";

import cn from "classnames";
import { useSelector } from "react-redux";

import { userRankingSelector } from "@/selectors";
import useMatchesStatistics from "@/utils/useMatchesStatistics";

import i18next from "../../../i18n";

function StatisticsCard({ playerId, matchList = [], compact = false }) {
  const [playerStats] = useMatchesStatistics(playerId, matchList);
  const playerRanking = useSelector(userRankingSelector(playerId));
  const noWinnerCount =
    matchList.length - playerStats.winMatches.length - playerStats.lostMatches.length;
  const finishedMatches = useMemo(
    () => matchList.filter((match) => !!match.playerResults?.[playerId]),
    [matchList, playerId],
  );
  const avgResultPercent = finishedMatches.length ? playerStats.avgTests.toFixed(1) : "0.0";

  return (
    <div className={cn("cb-bg-highlight-panel cb-rounded px-3 py-2", compact && "w-100")}>
      <div className="d-flex flex-wrap align-items-center small">
        <span className="mr-3 mb-1">
          {i18next.t("Place")}:{" "}
          <span className="font-weight-bold">{playerRanking?.place ?? "?"}</span>
        </span>
        <span className="mr-3 mb-1">
          {i18next.t("Score")}:{" "}
          <span className="font-weight-bold">{playerRanking?.score ?? 0}</span>
        </span>
        <span className="mr-3 mb-1">
          {i18next.t("Avg Result")}: <span className="font-weight-bold">{avgResultPercent}%</span>
        </span>
        <span className="mb-1">
          {i18next.t("Stats: ")}
          <span className="font-weight-bold">
            {i18next.t("Win")} {playerStats.winMatches.length}
            {" / "}
            {i18next.t("Lost")} {playerStats.lostMatches.length}
            {" / "}
            {i18next.t("Draw")} {noWinnerCount}
          </span>
        </span>
      </div>
    </div>
  );
}

export default memo(StatisticsCard);
