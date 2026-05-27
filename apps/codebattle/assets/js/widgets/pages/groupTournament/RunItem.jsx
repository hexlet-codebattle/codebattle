import React, { useMemo } from "react";
import cn from "classnames";
import i18n from "../../../i18n";
import {
  formatDuration,
  isSliceRun,
  isRoundRun,
  getPlaceFor,
  getTitleForRun,
} from "../../utils/groupTournament";

const RunItem = ({ item, items, runId, setRunId, leaderboard, currentUserId }) => {
  const isActive = runId === item.id;
  const onClick = () => setRunId(item.id);

  const title = useMemo(() => getTitleForRun(item, items), [item, items]);

  const myEntry = useMemo(() => {
    if (!Number.isInteger(currentUserId) || !Array.isArray(leaderboard)) return null;
    return leaderboard.find((e) => e.userId === currentUserId) || null;
  }, [leaderboard, currentUserId]);

  const pending = item.status === "pending" || item.isStub;
  const roundRun = isRoundRun(item);
  const place = roundRun ? (item.place ?? getPlaceFor(item, myEntry)) : null;
  const duration = formatDuration(item.durationMs);
  const sliceLabel = !item.isStub && isSliceRun(item) && Number.isInteger(item.sliceIndex)
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

  return (
    <div key={item.id} className="mb-2">
      <button
        type="button"
        onClick={onClick}
        className={cn(buttonClasses, "d-flex flex-column align-items-start w-100")}
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
          {item.isStub ? (
            <span
              className="font-weight-bold mr-3 text-nowrap text-white"
              style={{ opacity: 0.75 }}
            >
              {item.kind === "seed"
                ? i18n.t("Group assignment soon")
                : i18n.t("Group contest soon")}
            </span>
          ) : pending ? (
            i18n.t("Running…")
          ) : (
            <>
              <span
                className="font-weight-bold mr-3 text-nowrap text-white"
                style={{ opacity: 0.75 }}
              >
                {item.status === "error" && i18n.t("Error")}
                {item.status === "timeout" && i18n.t("Time Limit")}
                {item.status !== "error" &&
                  item.status !== "timeout" &&
                  i18n.t("Score: %{score}", { score: item.score ?? 0 })}
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
