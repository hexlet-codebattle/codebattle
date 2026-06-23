import cn from "classnames";
import moment from "moment";
import i18n from "../../i18n";
import { LEADERBOARD_TRUNCATE_LEN } from "../config/groupTournament";

export const trClassName = (place) =>
  cn("font-weight-bold cb-custom-event-tr-border", {
    "cb-gold-place-bg": place === 1,
    "cb-silver-place-bg": place === 2,
    "cb-bronze-place-bg": place === 3,
    "cb-bg-panel": !place || place > 3,
  });

export const tdClassName =
  "p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0";

export const tabBtnClass = (active) =>
  cn("btn btn-sm px-4 py-2 mr-2 my-1 shadow-none border-0 rounded-pill text-nowrap cb-tab-btn", {
    "text-white cb-tab-btn--active": active,
    "text-white-50": !active,
  });

export const tabBtnStyle = (active) => ({
  borderBottom: active ? "3px solid #3182ce" : "3px solid transparent",
  transition: "all 0.2s ease-in-out",
});

export function roundLabel(roundNumber) {
  if (roundNumber === 1) return i18n.t("Seed");
  return i18n.t("Round %{n}", { n: roundNumber - 1 });
}

export function truncate(value) {
  if (typeof value !== "string") return value;
  if (value.length <= LEADERBOARD_TRUNCATE_LEN) return value;
  return `${value.slice(0, LEADERBOARD_TRUNCATE_LEN - 1)}…`;
}

export const formatDuration = (durationMs) => {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

export const isSeedRun = (item) => item?.kind === "seed";
export const isSliceRun = (item) => item?.kind === "slice";
export const isRoundRun = (item) => isSeedRun(item) || isSliceRun(item);

export const getPlaceFor = (item, leaderboardEntry) => {
  if (!leaderboardEntry?.rounds) return null;
  const key = isSeedRun(item) ? 1 : item?.roundPosition;
  if (!Number.isInteger(key)) return null;
  const cell = leaderboardEntry.rounds[key] || leaderboardEntry.rounds[String(key)];
  return Number.isInteger(cell?.place) ? cell.place : null;
};

export const getTitleForRun = (item, allItems) => {
  if (isSeedRun(item)) {
    return i18n.t("Qualification run");
  }
  if (isSliceRun(item)) {
    const r = Number.isInteger(item.roundPosition) ? item.roundPosition - 1 : null;
    return r ? `${i18n.t("Group run")} ${r}` : i18n.t("Group run");
  }

  const userRuns = allItems.filter((i) => !isRoundRun(i));
  const myIndexInUserRuns = userRuns.findIndex((i) => i.id === item.id);

  if (myIndexInUserRuns !== -1) {
    const userTotal = userRuns.length;
    return `${i18n.t("Test run")} v${userTotal - myIndexInUserRuns}`;
  }

  return i18n.t("Test run"); // Fallback
};

export const detectOS = () => {
  const platform =
    (typeof navigator !== "undefined" &&
      ((navigator.userAgentData && navigator.userAgentData.platform) ||
        navigator.platform ||
        navigator.userAgent)) ||
    "";
  const value = platform.toLowerCase();

  if (value.includes("win")) return "windows";
  if (value.includes("mac") || value.includes("iphone") || value.includes("ipad")) return "mac";
  return "linux";
};

// Builds a vscode://file/... deep link that opens <folder> from the player's
// standard Downloads directory. We only store the folder name, so the home
// directory is resolved per detected OS. Note: VS Code does not expand env vars
// in file URIs — the link assumes the conventional Downloads location.
export const buildVscodeFolderUrl = (folderName, os = detectOS()) => {
  if (!folderName) return null;

  const safe = String(folderName)
    .trim()
    .replace(/^[/\\]+|[/\\]+$/g, "");

  if (!safe) return null;

  const encoded = safe
    .split(/[/\\]+/)
    .map(encodeURIComponent)
    .join("/");

  switch (os) {
    case "windows":
      return `vscode://file/%USERPROFILE%/Downloads/${encoded}`;
    case "mac":
    case "linux":
    default:
      return `vscode://file/$HOME/Downloads/${encoded}`;
  }
};

export const isOnBreak = (groupTournament) => {
  const roundStartedAt = groupTournament?.lastRoundStartedAt || groupTournament?.startedAt;
  if (!roundStartedAt) return false;

  const startMoment = moment.utc(roundStartedAt);
  return startMoment.isAfter(moment());
};
