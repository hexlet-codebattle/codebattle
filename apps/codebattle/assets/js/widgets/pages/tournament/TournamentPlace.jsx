import React, { memo } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import i18next from "i18next";
import { useSelector } from "react-redux";

import { currentUserCanModerateTournament, tournamentHideResultsSelector } from "@/selectors";

function TournamentPlace({ place, title = "", withIcon = false }) {
  const hideResults = useSelector(tournamentHideResultsSelector);
  const canModerate = useSelector(currentUserCanModerateTournament);

  const text = !hideResults || canModerate ? place : "?";
  const prefix = title.length > 0 || withIcon ? ": " : "";
  const muteResults = canModerate && hideResults;

  const className = cn({ "p-1 bg-light rounded-lg": muteResults });
  const iconClassName = "text-warninG";
  const textClassName = cn({ "text-muted": muteResults });

  return (
    <span className={className}>
      {withIcon && <FontAwesomeIcon className={iconClassName} icon="trophy" />}
      <span className={textClassName}>
        {i18next.t(title)}
        {prefix}
        {text}
      </span>
    </span>
  );
}

export default memo(TournamentPlace);
