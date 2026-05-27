import cn from "classnames";
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
  `btn btn-sm px-4 py-2 mr-2 my-1 shadow-none border-0 rounded-pill text-nowrap cb-tab-btn ${
    active ? "text-white font-weight-bold cb-tab-btn--active" : "text-white-50"
  }`;

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
