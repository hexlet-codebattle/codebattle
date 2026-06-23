import React, { memo } from "react";

import cn from "classnames";
import i18next from "i18next";

import TournamentTypes from "../../config/tournamentTypes";

const redirectNoticeClassName = cn(
  "d-flex flex-column flex-md-row align-items-md-center justify-content-between",
  "border-top border-bottom-0 cb-border-color py-2 gap-2",
);

function Top200RedirectButton({ currentRoundPosition, player, playersRedirectUrl, type }) {
  const playerPlace = Number(player?.place);
  const showButton =
    type === TournamentTypes.top200 &&
    typeof playersRedirectUrl === "string" &&
    playersRedirectUrl.length > 0 &&
    currentRoundPosition >= 4 &&
    Number.isFinite(playerPlace) &&
    playerPlace >= 9 &&
    playerPlace <= 200;

  if (!showButton) {
    return null;
  }

  return (
    <div className={redirectNoticeClassName}>
      <span className="font-weight-bold cb-text-light">
        {i18next.t("The tournament continues for top 8 players.")}
      </span>
      <a className="btn btn-sm btn-warning text-nowrap" href={playersRedirectUrl}>
        {i18next.t("Continue")}
      </a>
    </div>
  );
}

export default memo(Top200RedirectButton);
