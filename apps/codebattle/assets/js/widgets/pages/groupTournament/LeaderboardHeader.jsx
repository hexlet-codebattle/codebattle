import React from "react";
import i18n from "../../../i18n";

const LeaderboardHeader = ({ currentRoundPosition, roundsCount }) => (
  <div className="d-flex justify-content-between border-bottom cb-border-color pb-2 px-3">
    <span className="font-weight-bold">{i18n.t("Leaderboard")}</span>
    {Number.isInteger(currentRoundPosition) && Number.isInteger(roundsCount) && (
      <span className="text-muted small">
        {`${i18n.t("Round")} ${currentRoundPosition}/${roundsCount}`}
      </span>
    )}
  </div>
);

export default LeaderboardHeader;
