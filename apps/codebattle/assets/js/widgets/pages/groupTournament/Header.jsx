import React from "react";
import moment from "moment";
import i18n from "../../../i18n";
import useTimer from "../../utils/useTimer";

const statusBadge = {
  active: { className: "badge-success", labelKey: "Active" },
  finished: { className: "badge-secondary", labelKey: "Finished" },
  loading: { className: "badge-warning", labelKey: "Loading" },
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

  return <span className="text-monospace mr-3">{time}</span>;
}

function Header({ name, status, groupTournament }) {
  const badge = statusBadge[status] || statusBadge.loading;

  return (
    <div className="cb-bg-panel shadow-sm cb-rounded p-3 d-flex align-items-center justify-content-between flex-wrap w-100">
      <h4 className="mb-0 mr-3">{name || i18n.t("Group Tournament")}</h4>
      <div className="d-flex align-items-center ml-auto">
        <TournamentTimer groupTournament={groupTournament} />
        <span className={`badge ${badge.className} px-3 py-2`}>{i18n.t(badge.labelKey)}</span>
      </div>
    </div>
  );
}

export default Header;
