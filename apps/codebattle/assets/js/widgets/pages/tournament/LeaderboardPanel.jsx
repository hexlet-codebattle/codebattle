import React, { useEffect, memo, useState } from "react";

import { useDispatch } from "react-redux";

import i18n from "../../../i18n";
import TournamentStates from "../../config/tournament";
import { getResults } from "../../middlewares/Tournament";

import FinishedLeaderboard from "./FinishedLeaderboard";
import PlayersRankingPanel from "./PlayersRankingPanel";

function LeaderboardPanel({ state, ranking, playersCount }) {
  const dispatch = useDispatch();
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    if (state === TournamentStates.finished) {
      console.log("Tournament finished, fetching leaderboard...");
      dispatch(
        getResults("leaderboard", {}, (data) => {
          console.log("Leaderboard fetched");
          setLeaderboard(data);
        }),
      );
    }
  }, [state, dispatch]);

  if (state === TournamentStates.finished && leaderboard && leaderboard.length > 0) {
    return <FinishedLeaderboard leaderboard={leaderboard} />;
  }

  if (ranking) {
    return <PlayersRankingPanel playersCount={playersCount} ranking={ranking} />;
  }

  return (
    <div className="text-center text-muted mt-4">{i18n.t("No leaderboard data available")}</div>
  );
}

export default memo(LeaderboardPanel);
