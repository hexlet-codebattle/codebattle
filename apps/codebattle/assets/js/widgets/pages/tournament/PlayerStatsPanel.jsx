import React, { memo, useMemo } from "react";

import i18next from "i18next";
import reverse from "lodash/reverse";

import Loading from "../../components/Loading";
import UsersMatchList from "./UsersMatchList";

function PlayerStatsPanel({ matches, players, currentUserId, hideBots, canModerate }) {
  const currentPlayer = players[currentUserId];

  const matchList = useMemo(
    () =>
      reverse(Object.values(matches)).filter((match) => match.playerIds.includes(currentUserId)),
    [matches, currentUserId],
  );

  if (!currentPlayer) {
    return <Loading />;
  }

  return (
    <div className="d-flex flex-column cb-rounded shadow-sm cb-bg-panel">
      {currentPlayer.state === "banned" && (
        <div className="alert alert-warning m-2 mb-0" role="alert">
          {i18next.t(
            "Your tournament access is temporarily restricted due to a fair-play review. You cannot be paired into new games right now. If you believe this is a mistake, please contact tournament support.",
          )}
        </div>
      )}
      <div className="d-flex flex-column">
        <div>
          <div className="d-flex justify-content-center border-bottom cb-border-color p-2 font-weight-bold text-uppercase">
            {i18next.t("Matches")}
          </div>
          <UsersMatchList
            currentUserId={currentUserId}
            playerId={currentUserId}
            matches={matchList}
            canModerate={canModerate}
            hideStats
            hideBots={hideBots}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(PlayerStatsPanel);
