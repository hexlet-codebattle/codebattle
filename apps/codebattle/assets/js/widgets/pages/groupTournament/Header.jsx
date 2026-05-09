import React from "react";
import moment from "moment";
import i18n from "../../../i18n";
import useTimer from "../../utils/useTimer";

const statusBadge = {
  active: { className: "btn-success", labelKey: "Active" },
  finished: { className: "btn-secondary", labelKey: "Finished" },
  loading: { className: "btn-warning", labelKey: "Loading" },
};

function TournamentTimer({ groupTournament }) {
  const startedAt = groupTournament?.startedAt;
  const timeoutSeconds = groupTournament?.roundTimeoutSeconds;
  const endsAt =
    startedAt && Number.isInteger(timeoutSeconds)
      ? moment.utc(startedAt).add(timeoutSeconds, "seconds")
      : null;

  const [time, seconds] = useTimer(endsAt);

  if (groupTournament?.state !== "active" || !endsAt || (!seconds && !time)) {
    return null;
  }

  const color = seconds <= 60 ? "#ff3b30" : seconds <= 300 ? "#ffe500" : "#ffffff";

  return (
    <span
      className="text-monospace rounded-pill px-4 py-2"
      style={{
        fontSize: "1.5rem",
        color,
        border: `1px solid ${color}`,
      }}
    >
      {time}
    </span>
  );
}

function Header({ name, status, groupTournament }) {
  const badge = statusBadge[status] || statusBadge.loading;

  return (
    <div className="cb-custom-event-profile d-flex align-items-center w-100 position-relative">
      <h4 className="mb-0 mr-3 text-white">{name || i18n.t("Group Tournament")}</h4>
      <div
        className="position-absolute"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <TournamentTimer groupTournament={groupTournament} />
      </div>
      <div className="d-flex align-items-center ml-auto">
        <span className={`btn ${badge.className} rounded-pill px-4 mr-3`}>
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
