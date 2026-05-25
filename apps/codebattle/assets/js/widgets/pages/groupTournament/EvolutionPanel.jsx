import React, { useMemo, useState } from "react";
import dayjs from "../../../i18n/dayjs";
import i18n from "../../../i18n";

const ACCENT_USER = "rgba(99, 102, 121, 0.95)";
const ACCENT_SEED = "rgba(20, 184, 166, 0.95)";
const ACCENT_SLICE = "rgba(139, 92, 246, 0.95)";
const ACCENT_ACTIVE = "rgba(96, 165, 250, 0.95)";

const STATUS_SUCCESS = "rgba(40, 167, 69, 0.95)";
const STATUS_ERROR = "rgba(220, 53, 69, 0.95)";
const STATUS_PENDING = "rgba(245, 158, 11, 0.95)";

const getExternalUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    const externalUrl = new URL(`${url.replace(/\/$/, "")}/browse/README.md`);

    externalUrl.searchParams.set("rev", "main");
    externalUrl.searchParams.set(
      "chatMessage",
      "Это ИИ-ассистент, который поможет тебе решить задачу.",
    );

    return externalUrl.toString();
  } catch (error) {
    console.error("group_tournament: invalid repo url", url, error);
    return null;
  }
};

const formatInsertedAtTooltip = (insertedAt) => {
  if (!insertedAt) {
    return undefined;
  }

  const date = dayjs.utc(insertedAt).tz(dayjs.tz.guess());

  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : undefined;
};

// Submission duration is "time from tournament start to when the user
// submitted the solution being scored", in ms. Render mm:ss when under an
// hour, hh:mm:ss otherwise.
const formatDuration = (durationMs) => {
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

const isSeedRun = (item) => item?.kind === "seed";
const isSliceRun = (item) => item?.kind === "slice";
const isRoundRun = (item) => isSeedRun(item) || isSliceRun(item);
const isPending = (item) => item?.status === "pending";
const isError = (item) => item?.status === "error";
const isSuccess = (item) => item?.status === "success";

const kindAccent = (item) => {
  if (isSeedRun(item)) return ACCENT_SEED;
  if (isSliceRun(item)) return ACCENT_SLICE;
  return ACCENT_USER;
};

const statusAccent = (item) => {
  if (isPending(item)) return STATUS_PENDING;
  if (isError(item)) return STATUS_ERROR;
  if (isSuccess(item)) return STATUS_SUCCESS;
  return STATUS_PENDING;
};

const buildRunTitles = (items) => {
  if (!items || items.length === 0) {
    return {};
  }

  const titles = {};
  const userRunIds = [];

  items.forEach((item) => {
    if (!item?.id) {
      return;
    }

    if (isSeedRun(item)) {
      titles[item.id] = i18n.t("Seed");
    } else if (isSliceRun(item)) {
      // Round 1 is the seed round; slice rounds start at round_position=2 and
      // display as R1, R2, ... to match the leaderboard's round labels.
      const r = Number.isInteger(item.roundPosition) ? item.roundPosition - 1 : null;
      titles[item.id] = r ? `R${r}` : "R";
    } else {
      userRunIds.push(item.id);
    }
  });

  const userTotal = userRunIds.length;
  userRunIds.forEach((id, idx) => {
    titles[id] = `v${userTotal - idx}`;
  });

  return titles;
};

const getPlaceFor = (item, leaderboardEntry) => {
  if (!leaderboardEntry?.rounds) return null;
  const key = isSeedRun(item) ? 1 : item?.roundPosition;
  if (!Number.isInteger(key)) return null;
  const cell = leaderboardEntry.rounds[key] || leaderboardEntry.rounds[String(key)];
  return Number.isInteger(cell?.place) ? cell.place : null;
};

function EvolutionPanel({
  items,
  tournamentStatus,
  runId,
  setRunId,
  repoUrl,
  onAddSolution,
  leaderboard,
  currentUserId,
}) {
  const titles = buildRunTitles(items);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const externalUrl = tournamentStatus !== "finished" ? getExternalUrl(repoUrl) : null;
  const canAddSolutionInternal = tournamentStatus !== "finished" && !externalUrl && !!onAddSolution;

  const myEntry = useMemo(() => {
    if (!Number.isInteger(currentUserId) || !Array.isArray(leaderboard)) return null;
    return leaderboard.find((e) => e.userId === currentUserId) || null;
  }, [leaderboard, currentUserId]);

  return (
    <>
      <div
        className="cb-custom-event-profile d-flex align-items-center justify-content-center w-100"
        style={{ minHeight: "64px" }}
      >
        <h5 className="mb-0 text-white font-weight-bold">{i18n.t("Execution History")}</h5>
      </div>
      <div
        className="mt-3 p-3 w-100"
        style={{
          height: "80vh",
          overflowY: "auto",
          backgroundColor: "#30333f",
          borderRadius: "25px",
        }}
      >
        <div
          style={{
            paddingRight: "4px",
            overflowX: "hidden",
            scrollbarGutter: "stable",
          }}
        >
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="d-block text-decoration-none mb-3"
            >
              <div
                className="btn btn-yellow rounded-pill w-100 text-center"
                style={{ padding: "12px 12px" }}
              >
                {i18n.t("Add Solution +")}
              </div>
            </a>
          )}
          {canAddSolutionInternal && (
            <button
              type="button"
              onClick={onAddSolution}
              className="btn btn-yellow rounded-pill w-100 text-center mb-3"
              style={{ padding: "12px 12px" }}
            >
              {i18n.t("Add Solution +")}
            </button>
          )}
          {items && items.length > 0 && (
            <div className="mt-2 small d-flex flex-column">
              {items.map((item, idx) => {
                const isActive = runId === item?.id;
                const pending = isPending(item);
                const roundRun = isRoundRun(item);
                const accent = kindAccent(item);
                const ringColor = isActive ? ACCENT_ACTIVE : accent;
                const leftBorderColor = statusAccent(item);
                const title = (item?.id != null && titles[item.id]) || `v${items.length - idx}`;
                const score = item?.score;
                const place = roundRun ? getPlaceFor(item, myEntry) : null;
                const duration = formatDuration(item?.durationMs);
                const tooltip = formatInsertedAtTooltip(item?.insertedAt);
                const sliceLabel =
                  isSliceRun(item) && Number.isInteger(item.sliceIndex)
                    ? i18n.t("Group %{n}", { n: item.sliceIndex + 1 })
                    : null;

                return (
                  <div key={item?.id ?? idx} className="mb-2">
                    <button
                      type="button"
                      onClick={() => setRunId(item?.id)}
                      className={`rounded-pill p-2 px-3 text-left bg-transparent ${
                        pending ? "cb-run-pending" : ""
                      }`}
                      style={{
                        borderTop: `1px solid ${ringColor}`,
                        borderRight: `1px solid ${ringColor}`,
                        borderBottom: `1px solid ${ringColor}`,
                        borderLeft: `3px solid ${leftBorderColor}`,
                        backgroundColor: isActive ? "rgba(96, 165, 250, 0.25)" : "transparent",
                        boxShadow: isActive ? "0 0 0 1px rgba(96, 165, 250, 0.5)" : "none",
                        transition: "background-color 160ms ease, box-shadow 160ms ease",
                        width: "100%",
                      }}
                      onMouseEnter={(event) => {
                        if (!isActive) {
                          event.currentTarget.style.backgroundColor = "rgba(148, 163, 184, 0.1)";
                        }
                        if (tooltip) {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setHoverTooltip({
                            text: tooltip,
                            top: rect.top + rect.height / 2,
                            left: rect.right + 8,
                          });
                        }
                      }}
                      onMouseLeave={(event) => {
                        if (!isActive) {
                          event.currentTarget.style.backgroundColor = "transparent";
                        }
                        setHoverTooltip(null);
                      }}
                    >
                      <div className="d-flex align-items-center text-nowrap">
                        <span
                          className="badge mr-2"
                          style={{
                            backgroundColor: accent,
                            color: "#fff",
                          }}
                        >
                          {title}
                        </span>
                        {pending ? (
                          <span
                            className="font-weight-bold"
                            style={{
                              fontSize: "1rem",
                              color: isActive ? "#ffffff" : "#fbbf24",
                            }}
                          >
                            {i18n.t("Running…")}
                          </span>
                        ) : (
                          <span
                            className="font-weight-bold mr-2"
                            style={{
                              fontSize: "1.15rem",
                              color: isActive ? "#ffffff" : "#e2e8f0",
                            }}
                          >
                            {i18n.t("Score %{score}", { score: score ?? 0 })}
                          </span>
                        )}
                        {sliceLabel && (
                          <span
                            className={`small mr-2 ${isActive ? "text-white-50" : "text-muted"}`}
                          >
                            {sliceLabel}
                          </span>
                        )}
                      </div>
                      {!pending && !roundRun && (
                        <div className={`small mt-1 ${isActive ? "text-white-50" : "text-muted"}`}>
                          {i18n.t("Test run")}
                          {duration && (
                            <span className="ml-2">
                              {i18n.t("Time: %{duration}", { duration })}
                            </span>
                          )}
                        </div>
                      )}
                      {!pending && roundRun && (
                        <div className={`small mt-1 ${isActive ? "text-white-50" : "text-muted"}`}>
                          {Number.isInteger(place)
                            ? i18n.t("Place: #%{place}", { place })
                            : i18n.t("Place: pending")}
                          {duration && (
                            <span className="ml-2">
                              {i18n.t("Time: %{duration}", { duration })}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {hoverTooltip && (
        <div
          className="cb-run-item-tooltip"
          style={{ top: hoverTooltip.top, left: hoverTooltip.left }}
        >
          {hoverTooltip.text}
        </div>
      )}
    </>
  );
}

export default EvolutionPanel;
