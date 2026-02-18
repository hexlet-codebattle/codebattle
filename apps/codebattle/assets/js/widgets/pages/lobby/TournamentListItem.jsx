import React from "react";

import NiceModal from "@ebay/nice-modal-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";

import getIconForGrade from "@/components/icons/Grades";
import TournamentTimer from "@/components/TournamentTimer";
import { getRankingPoints, grades } from "@/config/grades";
import ModalCodes from "@/config/modalCodes";
import { getTournamentUrl } from "@/utils/urlBuilders";

import dayjs from "../../../i18n/dayjs";
import tournamentStates from "../../config/tournament";

const iconSize = { width: "22px", height: "22px" };

const mapTournamentTitleByState = {
  [tournamentStates.waitingParticipants]: "Waiting Players",
  [tournamentStates.active]: "Playing",
  [tournamentStates.canceled]: "Canceled",
  [tournamentStates.finished]: "Finished",
};

const getDateFormat = (grade) => {
  switch (grade) {
    case grades.open:
      return "MMM D, YYYY [at] h:mma";
    default:
      return "[at] h:mma";
  }
};

const getActionText = (tournament) => {
  switch (tournament.state) {
    case tournamentStates.waitingParticipants:
      return "Join";
    case tournamentStates.active:
      return "Join";
    case tournamentStates.canceled:
      return "Show";
    case tournamentStates.finished:
      return "Results";
    default:
      return "Show";
  }
};

function TournamentTitle({ tournament }) {
  if (tournament.grade === grades.open) {
    return (
      <span
        title={tournament.name}
        className="h5 mb-1 font-weight-bold text-white text-truncate d-inline-block cb-tournament-title"
      >
        {tournament.name}
      </span>
    );
  }

  const subtitle = dayjs(tournament.startsAt).format("MMM D, YYYY [at] HH:mm");

  return (
    <div className="d-flex flex-column align-items-baseline">
      <span className="h5 mb-1 font-weight-bold text-white text-truncate d-inline-block">
        {tournament.name}
      </span>
      <span className="small">{subtitle}</span>
    </div>
  );
}

function TournamentAction({ tournament, isAdmin = false }) {
  const text = getActionText(tournament);
  const showTournamentLink = tournament.state !== tournamentStates.upcoming || isAdmin;

  const openTournamentInfo = () => {
    NiceModal.show(ModalCodes.tournamentModal, { tournament });
  };

  const infoClassName = cn(
    "btn btn-outline-secondary cb-btn-outline-secondary cb-tournament-info-icon-btn",
    "px-2 cb-rounded border-0",
  );

  const actionClassName = cn(
    "btn btn-secondary cb-btn-secondary cb-tournament-main-action",
    "text-nowrap px-2 cb-rounded",
  );

  return (
    <div className="align-content-center cb-tournament-top-actions">
      <div className="d-flex cb-tournament-actions">
        {showTournamentLink && (
          <a type="button" className={actionClassName} href={getTournamentUrl(tournament.id)}>
            {text}
          </a>
        )}
        <button
          type="button"
          className={infoClassName}
          onClick={openTournamentInfo}
          aria-label="Tournament details"
          title="Tournament details"
        >
          <FontAwesomeIcon icon="info" />
        </button>
      </div>
    </div>
  );
}

const showStartsAt = (state) =>
  [
    tournamentStates.active,
    tournamentStates.waitingParticipants,
    tournamentStates.upcoming,
  ].includes(state);

function TournamentListItem({ tournament, isAdmin = false }) {
  return (
    <div className="border cb-border-color cb-rounded cb-subtle-background my-2 mr-2 cb-tournament-card">
      <div className="d-flex flex-column p-3 align-content-center align-items-baseline cb-tournament-card-body">
        <div className="d-flex align-items-center cb-tournament-title-wrap">
          <div className="d-none d-lg-block d-md-block mr-2 mb-3">
            {getIconForGrade(tournament.grade)}
          </div>
          <TournamentTitle tournament={tournament} />
        </div>
        <div className="cb-separator mb-2" />
        <div className="d-flex w-100 justify-content-between cb-tournament-meta-row">
          <div className="d-flex flex-column align-items-baseline cb-tournament-meta">
            {tournament.grade !== grades.open && (
              <span title={tournament.name} className="d-inline-flex mt-2 text-white text-nowrap">
                <span className="cb-tournament-points-value">
                  {getRankingPoints(tournament.grade)[0]}
                </span>
                <span className="ml-1">Ranking Points</span>
              </span>
            )}
            <span className="d-flex flex-wrap">
              {tournament.state !== "upcoming" && (
                <span className="mr-2 d-inline-flex mt-2 text-white text-nowrap">
                  <FontAwesomeIcon
                    icon="flag-checkered"
                    className="mr-2 text-warning"
                    style={iconSize}
                  />
                  {mapTournamentTitleByState[tournament.state]}
                </span>
              )}
              {tournamentStates.canceled !== tournament.state &&
                tournament.state !== "upcoming" && (
                  <span className="d-inline-flex mt-2 text-white text-nowrap">
                    <FontAwesomeIcon icon="user" className="mr-2 text-warning" style={iconSize} />
                    {tournament.playersCount}
                  </span>
                )}
            </span>
            {showStartsAt(tournament.state) && (
              <>
                {dayjs(tournament.startsAt).diff(dayjs(), "hours") <= 24 && (
                  <span className="d-inline-flex mt-2 text-nowrap cb-tournament-starts-in">
                    <FontAwesomeIcon
                      icon="clock"
                      className="mr-2 cb-tournament-gold"
                      style={iconSize}
                    />
                    <TournamentTimer label="starts in" date={tournament.startsAt}>
                      {dayjs(tournament.startsAt).format(getDateFormat(tournament.grade))}
                    </TournamentTimer>
                  </span>
                )}
              </>
            )}
            {tournament.state === tournamentStates.finished && (
              <span className="d-none d-lg-inline-flex d-md-inline-flex d-sm-inline-flex pr-2 mt-2 text-white text-nowrap">
                <FontAwesomeIcon icon="clock" className="mr-2 text-warning" style={iconSize} />
                {dayjs(tournament.lastRoundEndedAt).format(getDateFormat(tournament.grade))}
              </span>
            )}
          </div>
          <TournamentAction tournament={tournament} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}

export default TournamentListItem;
