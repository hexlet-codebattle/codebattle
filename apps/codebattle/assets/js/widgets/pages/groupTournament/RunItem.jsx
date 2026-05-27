import React, { useMemo } from "react";
import cn from "classnames";
import i18n from "../../../i18n";
import dayjs from "../../../i18n/dayjs";

const formatInsertedAtTooltip = (insertedAt) => {
  if (!insertedAt) {
    return undefined;
  }

  const date = dayjs.utc(insertedAt).tz(dayjs.tz.guess());

  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : undefined;
};

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

const getPlaceFor = (item, leaderboardEntry) => {
  if (!leaderboardEntry?.rounds) return null;
  const key = isSeedRun(item) ? 1 : item?.roundPosition;
  if (!Number.isInteger(key)) return null;
  const cell = leaderboardEntry.rounds[key] || leaderboardEntry.rounds[String(key)];
  return Number.isInteger(cell?.place) ? cell.place : null;
};

const getTitleForRun = (item, allItems) => {
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

const RunItem = ({ item, items, setHoverTooltip, runId, setRunId, leaderboard, currentUserId }) => {
  const isActive = runId === item.id;
  const onClick = () => setRunId(item.id);

  const title = useMemo(() => getTitleForRun(item, items), [item, items]);

  const myEntry = useMemo(() => {
    if (!Number.isInteger(currentUserId) || !Array.isArray(leaderboard)) return null;
    return leaderboard.find((e) => e.userId === currentUserId) || null;
  }, [leaderboard, currentUserId]);

  const pending = item.status === "pending";
  const roundRun = isRoundRun(item);
  const place = roundRun ? (item.place ?? getPlaceFor(item, myEntry)) : null;
  const duration = formatDuration(item.durationMs);
  const tooltip = formatInsertedAtTooltip(item.insertedAt);
  const sliceLabel =
    isSliceRun(item) && Number.isInteger(item.sliceIndex)
      ? i18n.t("Group %{n}", { n: item.sliceIndex + 1 })
      : null;

  const buttonClasses = cn("cb-run-item", {
    "cb-run-item--group": roundRun,
    "cb-run-item--test": !roundRun,
    "cb-run-item--active": isActive,
    "cb-run-item--error": item.status === "error",
    "cb-run-item--timeout": item.status === "timeout",
    "cb-run-item--pending": pending,
  });

  const titleClasses = cn("mr-2 font-weight-bold", {
    "cb-run-item__title--group": roundRun,
    "cb-run-item__title--test": !roundRun,
  });

  const onMouseEnter = (event) => {
    if (tooltip) {
      const rect = event.currentTarget.getBoundingClientRect();
      setHoverTooltip({
        text: tooltip,
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      });
    }
  };

  const onMouseLeave = () => {
    setHoverTooltip(null);
  };

  return (
    <div key={item.id} className="mb-2">
      <button
        type="button"
        onClick={onClick}
        className={cn(buttonClasses, "d-flex flex-column align-items-start w-100")}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="d-flex align-items-center justify-content-between w-100">
          <span className={titleClasses}>{title}</span>
          {sliceLabel && (
            <span className={`small ${isActive ? "text-white-50" : "text-muted"}`}>
              {sliceLabel}
            </span>
          )}
        </div>
        <div
          className={`d-flex flex-wrap align-items-center small mt-1 w-100 ${isActive ? "text-white-50" : "text-muted"}`}
        >
          {pending ? (
            i18n.t("Running…")
          ) : (
            <>
              <span
                className="font-weight-bold mr-3 text-nowrap text-white"
                style={{ opacity: 0.9 }}
              >
                {item.status === "error" && i18n.t("Error")}
                {item.status === "timeout" && i18n.t("Time Limit")}
                {item.status !== "error" &&
                  item.status !== "timeout" &&
                  i18n.t("Score %{score}", { score: item.score ?? 0 })}
              </span>
              {roundRun && (
                <span
                  className="font-weight-bold ml-auto text-nowrap text-white"
                  style={{ opacity: 0.75 }}
                >
                  {Number.isInteger(place)
                    ? i18n.t("Place: #%{place}", { place })
                    : i18n.t("Place: pending")}
                </span>
              )}
              {duration && !roundRun && (
                <span className="ml-auto text-nowrap">
                  {i18n.t("Time: %{duration}", { duration })}
                </span>
              )}
            </>
          )}
        </div>
      </button>
    </div>
  );
};

export default RunItem;
