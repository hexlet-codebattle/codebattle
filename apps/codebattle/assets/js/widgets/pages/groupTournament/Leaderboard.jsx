import React, { useMemo, useState } from "react";
import LeaderboardHeader from "./LeaderboardHeader";
import LeaderboardTabs from "./LeaderboardTabs";
import LeaderboardRatingTable from "./LeaderboardRatingTable";
import LeaderboardSliceRoundView from "./LeaderboardSliceRoundView";

function Leaderboard({
  leaderboard,
  roundsCount,
  currentRoundPosition,
  isFinished,
  currentUserId,
}) {
  const rounds = useMemo(() => {
    if (!Number.isInteger(roundsCount) || roundsCount < 1) return [];
    return Array.from({ length: roundsCount }, (_, i) => i + 1);
  }, [roundsCount]);

  const [activeTab, setActiveTab] = useState("rating");

  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 p-3 w-100 overflow-auto cb-group-tournament-leaderboard-container">
      <div className="p-3 cb-rounded overflow-auto">
        <div className="my-2">
          <div className="d-flex flex-column flex-grow-1 position-relative py-2 mh-100 rounded-left">
            <LeaderboardHeader
              currentRoundPosition={currentRoundPosition}
              roundsCount={roundsCount}
            />
            <LeaderboardTabs activeTab={activeTab} setActiveTab={setActiveTab} rounds={rounds} />
            {activeTab !== "rating" ? (
              <div className="px-3 py-2">
                <LeaderboardSliceRoundView
                  leaderboard={leaderboard}
                  roundNumber={Number(activeTab.replace("round-", ""))}
                  currentUserId={currentUserId}
                />
              </div>
            ) : (
              <LeaderboardRatingTable
                leaderboard={leaderboard}
                rounds={rounds}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
