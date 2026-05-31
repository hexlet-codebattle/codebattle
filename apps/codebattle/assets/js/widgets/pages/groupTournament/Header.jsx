import React, { useState, useEffect } from "react";
import moment from "moment";
import PictureInPicture from "@/components/PictureInPicture";
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

function PipTimerContent({ status, groupTournament }) {
  const isWaiting = status === "waiting_participants";

  if (status === "finished" || groupTournament?.state === "finished") {
    return (
      <span
        className="border border-secondary bg-secondary text-white rounded-pill px-4 py-2 font-weight-bold"
        style={{ fontSize: "1.5rem" }}
      >
        {i18n.t("Finished")}
      </span>
    );
  }

  const isTimerActive = !isWaiting && groupTournament?.state === "active";

  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center p-2">
      {isWaiting ? (
        <WaitingStartTimer startsAt={groupTournament?.startsAt} />
      ) : isTimerActive ? (
        <TournamentTimer groupTournament={groupTournament} />
      ) : (
        <span
          className="text-monospace rounded-pill px-4 py-2 border border-warning text-warning"
          style={{ fontSize: "1.5rem" }}
        >
          {i18n.t(statusBadge[status]?.labelKey || "Group Tournament")}
        </span>
      )}
    </div>
  );
}

function Header({ name, status, groupTournament }) {
  const [isPipActive, setIsPipActive] = useState(false);
  const badge = statusBadge[status] || statusBadge.loading;
  const isWaiting = status === "waiting_participants";
  const isPipSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;

  useEffect(() => {
    if (!isPipSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPipActive(true);
      }
    };

    const handleInteraction = () => {
      if (document.visibilityState === "visible") {
        setIsPipActive(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("click", handleInteraction);
    document.addEventListener("keydown", handleInteraction);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [isPipSupported]);

  return (
    <div className="cb-custom-event-profile d-flex align-items-center w-100 position-relative">
      <h4 className="mb-0 mr-3 text-white">{name || i18n.t("Group Tournament")}</h4>
      <div
        className="position-absolute d-flex align-items-center"
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
        <a
          className="btn btn-outline-light rounded-pill px-4"
          href="https://t.me/+Z0_UGvNt_yE4ODcy"
        >
          {i18n.t("Support")}
        </a>
        <a className="btn btn-outline-light rounded-pill px-4" href="/">
          {i18n.t("Back to event")}
        </a>
      </div>
      {isPipSupported && (
        <PictureInPicture
          isActive={isPipActive}
          onClose={() => setIsPipActive(false)}
          width={320}
          height={150}
        >
          <PipTimerContent status={status} groupTournament={groupTournament} />
        </PictureInPicture>
      )}
    </div>
  );
}

export default Header;
