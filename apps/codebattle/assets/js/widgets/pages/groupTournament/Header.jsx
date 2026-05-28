import React from "react";
import moment from "moment";
import i18n from "../../../i18n";
import useTimer from "../../utils/useTimer";
import { isOnBreak } from "../../utils/groupTournament";

const statusBadge = {
  active: {
    className: "border-success bg-success text-white p-2",
    labelKey: "Active",
  },
  finished: {
    className: "border-secondary bg-secondary text-white p-2",
    labelKey: "Finished",
  },
  waiting_participants: {
    style: {
      backgroundColor: "#fffb47",
      color: "black",
      border: "1px solid #fffb47",
    },
    labelKey: "Ожидание начала",
  },
  loading: {
    style: {
      backgroundColor: "#fffb47",
      color: "black",
      border: "1px solid #fffb47",
    },
    labelKey: "Ожидание начала",
  },
};

function WaitingStartTimer({ startsAt }) {
  const target = startsAt ? moment.utc(startsAt) : null;
  const [time, seconds] = useTimer(target);
  const overdue = !target || (target && target.local().diff(moment()) <= 0);
  const color = overdue ? "#7fdbff" : seconds <= 60 ? "#ff3b30" : "#ffe500";
  const label = overdue ? i18n.t("Tournament will start soon") : time;

  return (
    <span
      className="text-monospace rounded-pill px-4 py-2"
      style={{
        fontSize: overdue ? "1.1rem" : "1.5rem",
        color,
        border: `1px solid ${color}`,
      }}
    >
      {label}
    </span>
  );
}

function TournamentTimer({ groupTournament }) {
  const roundStartedAt = groupTournament?.lastRoundStartedAt || groupTournament?.startedAt;
  const isSeedRound =
    groupTournament?.type === "ranked" &&
    groupTournament?.hasSeedRound &&
    groupTournament?.currentRoundPosition === 1;
  const timeoutSeconds =
    (isSeedRound && groupTournament?.seedRoundTimeoutSeconds) ||
    groupTournament?.roundTimeoutSeconds;

  const startMoment = roundStartedAt ? moment.utc(roundStartedAt) : null;
  const onBreak = isOnBreak(groupTournament);

  const target = onBreak
    ? startMoment
    : startMoment && Number.isInteger(timeoutSeconds)
      ? startMoment.clone().add(timeoutSeconds, "seconds")
      : null;

  const [time, seconds] = useTimer(target);

  const currentRound = groupTournament?.currentRoundPosition;
  const roundsCount = groupTournament?.roundsCount;
  const showRoundCounter =
    Number.isInteger(roundsCount) &&
    roundsCount > 1 &&
    Number.isInteger(currentRound) &&
    currentRound > 0;

  if (groupTournament?.state !== "active" || !target || (!seconds && !time)) {
    return null;
  }

  const checkingSolutions = !onBreak && seconds === 0;

  const color = onBreak
    ? "#7fdbff"
    : checkingSolutions
      ? "#7fdbff"
      : seconds <= 60
        ? "#ff3b30"
        : seconds <= 300
          ? "#ffe500"
          : "#ffffff";

  const label = onBreak
    ? `${i18n.t("Break")}: ${time}`
    : checkingSolutions
      ? i18n.t("Running solutions…")
      : time;

  return (
    <div className="d-flex align-items-center">
      {showRoundCounter && (
        <span
          className="text-monospace text-white mr-3"
          style={{ fontSize: "1.1rem", opacity: 0.85 }}
        >
          {`${i18n.t("Round")} ${currentRound}/${roundsCount}`}
        </span>
      )}
      <span
        className="text-monospace rounded-pill px-4 py-2"
        style={{
          fontSize: checkingSolutions ? "1.1rem" : "1.5rem",
          color,
          border: `1px solid ${color}`,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Header({ name, status, groupTournament }) {
  const badge = statusBadge[status] || statusBadge.loading;
  const isWaiting = status === "waiting_participants";

  return (
    <div className="cb-custom-event-profile d-flex align-items-center w-100 position-relative">
      <h4 className="mb-0 mr-3 text-white">{name || i18n.t("Group Tournament")}</h4>
      <div
        className="position-absolute"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      >
        {isWaiting ? (
          <WaitingStartTimer startsAt={groupTournament?.startsAt} />
        ) : (
          <TournamentTimer groupTournament={groupTournament} />
        )}
      </div>
      <div className="d-flex align-items-center ml-auto">
        <span
          className={`${badge.className || ""} rounded-pill px-4 py-2 mr-3 font-weight-bold`}
          style={badge.style}
        >
          {i18n.t(badge.labelKey)}
        </span>
        <a className="btn btn-outline-light rounded-pill px-4" href="/">
          {i18n.t("Back to event")}
        </a>
      </div>
    </div>
  );
}

export default Header;
