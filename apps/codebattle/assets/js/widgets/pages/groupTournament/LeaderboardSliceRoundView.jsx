import React, { useMemo, useState } from "react";
import i18n from "../../../i18n";
import { LEADERBOARD_SLICE_VIEW_INITIAL_LIMIT } from "../../config/groupTournament";
import LeaderboardSliceItem from "./LeaderboardSliceItem";

function LeaderboardSliceRoundView({ leaderboard, roundNumber, currentUserId }) {
  const [showAll, setShowAll] = useState(false);

  const slices = useMemo(() => {
    const bySlice = new Map();

    leaderboard.forEach((entry) => {
      const cell = entry.rounds && entry.rounds[roundNumber];
      if (!cell || !Number.isInteger(cell.sliceIndex)) return;
      const arr = bySlice.get(cell.sliceIndex) || [];
      arr.push({
        userId: entry.userId,
        name: entry.name || `#${entry.userId}`,
        clan: entry.clan,
        place: cell.place,
        score: cell.score ?? 0,
      });
      bySlice.set(cell.sliceIndex, arr);
    });

    const all = Array.from(bySlice.entries())
      .sort(([a], [b]) => a - b)
      .map(([sliceIndex, players]) => ({
        sliceIndex,
        players: players.slice().sort((a, b) => {
          const pa = Number.isInteger(a.place) ? a.place : Number.MAX_SAFE_INTEGER;
          const pb = Number.isInteger(b.place) ? b.place : Number.MAX_SAFE_INTEGER;
          if (pa !== pb) return pa - pb;
          if (b.score !== a.score) return b.score - a.score;
          return a.userId - b.userId;
        }),
        hasCurrentUser:
          Number.isInteger(currentUserId) && players.some((p) => p.userId === currentUserId),
      }));

    const currentIdx = all.findIndex((s) => s.hasCurrentUser);
    if (currentIdx > 0) {
      const [pinned] = all.splice(currentIdx, 1);
      all.unshift(pinned);
    }
    return all;
  }, [leaderboard, roundNumber, currentUserId]);

  if (slices.length === 0) {
    return <div className="text-muted p-3">{i18n.t("No round data yet")}</div>;
  }

  const overLimit = slices.length > LEADERBOARD_SLICE_VIEW_INITIAL_LIMIT;
  const visibleSlices =
    overLimit && !showAll ? slices.slice(0, LEADERBOARD_SLICE_VIEW_INITIAL_LIMIT) : slices;

  return (
    <>
      {overLimit && (
        <div className="mb-2 d-flex align-items-center">
          <span className="text-muted small mr-2">
            {showAll
              ? i18n.t("%{count} slices", { count: slices.length })
              : i18n.t("%{visible} / %{total} slices", {
                  visible: visibleSlices.length,
                  total: slices.length,
                })}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? i18n.t("Show less") : i18n.t("Show all")}
          </button>
        </div>
      )}
      <div className="d-flex flex-wrap" style={{ gap: "1rem" }}>
        {visibleSlices.map(({ sliceIndex, players, hasCurrentUser }) => (
          <LeaderboardSliceItem
            key={sliceIndex}
            sliceIndex={sliceIndex}
            players={players}
            hasCurrentUser={hasCurrentUser}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </>
  );
}

export default LeaderboardSliceRoundView;
