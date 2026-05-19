import React, { useMemo, useState } from "react";

import cn from "classnames";

import i18n from "../../../i18n";

const trClassName = (place) =>
  cn("font-weight-bold cb-custom-event-tr-border", {
    "cb-gold-place-bg": place === 1,
    "cb-silver-place-bg": place === 2,
    "cb-bronze-place-bg": place === 3,
    "cb-bg-panel": !place || place > 3,
  });

const tdClassName =
  "p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0";

const tabBtnClass = (active) =>
  cn("btn btn-sm mr-2 mb-2", {
    "btn-light text-dark font-weight-bold": active,
    "btn-outline-light": !active,
  });

function roundLabel(roundNumber) {
  if (roundNumber === 1) return i18n.t("Seed");
  return `R${roundNumber - 1}`;
}

const TRUNCATE_LEN = 9;

function truncate(value) {
  if (typeof value !== "string") return value;
  if (value.length <= TRUNCATE_LEN) return value;
  return `${value.slice(0, TRUNCATE_LEN - 1)}…`;
}

const SLICE_VIEW_INITIAL_LIMIT = 24;

function SliceRoundView({ leaderboard, roundNumber, currentUserId }) {
  const [showAll, setShowAll] = useState(false);

  // Group players by the slice they ran in during this round. Players with
  // no entry for the round (didn't participate yet, or weren't assigned) are
  // skipped.
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
          // Sort by place asc (nulls last), then score desc, then userId.
          const pa = Number.isInteger(a.place) ? a.place : Number.MAX_SAFE_INTEGER;
          const pb = Number.isInteger(b.place) ? b.place : Number.MAX_SAFE_INTEGER;
          if (pa !== pb) return pa - pb;
          if (b.score !== a.score) return b.score - a.score;
          return a.userId - b.userId;
        }),
        hasCurrentUser:
          Number.isInteger(currentUserId) && players.some((p) => p.userId === currentUserId),
      }));

    // Pin the slice containing the current user to the top-left.
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

  const overLimit = slices.length > SLICE_VIEW_INITIAL_LIMIT;
  const visibleSlices = overLimit && !showAll ? slices.slice(0, SLICE_VIEW_INITIAL_LIMIT) : slices;

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
          <div
            key={sliceIndex}
            className={cn("cb-bg-panel cb-rounded p-2", {
              "border border-warning": hasCurrentUser,
            })}
            style={{ minWidth: "20rem", flex: "1 1 22rem" }}
          >
            <div className="d-flex justify-content-between border-bottom cb-border-color pb-1 mb-2 px-2">
              <span className="font-weight-bold">
                {`${i18n.t("Slice")} ${sliceIndex + 1}`}
                {hasCurrentUser && (
                  <span className="badge badge-warning text-dark ml-2">{i18n.t("You")}</span>
                )}
              </span>
              <span className="text-muted small">
                {i18n.t("%{count} players", { count: players.length })}
              </span>
            </div>
            <table className="table table-sm cb-text-light mb-0">
              <thead>
                <tr>
                  <th className="border-0 font-weight-light p-1">#</th>
                  <th className="border-0 font-weight-light p-1">{i18n.t("Player")}</th>
                  <th className="border-0 font-weight-light p-1">{i18n.t("Clan")}</th>
                  <th className="border-0 font-weight-light p-1 text-right">{i18n.t("Score")}</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, idx) => {
                  const isMe = Number.isInteger(currentUserId) && p.userId === currentUserId;
                  return (
                    <tr
                      key={p.userId}
                      className={cn(trClassName(p.place), { "cb-current-user-row": isMe })}
                      style={isMe ? { outline: "2px solid #ffc107" } : undefined}
                    >
                      <td className="p-1 align-middle">{p.place ?? idx + 1}</td>
                      <td className="p-1 align-middle" title={p.name}>
                        {truncate(p.name)}
                      </td>
                      <td className="p-1 align-middle text-white" title={p.clan || ""}>
                        {p.clan ? truncate(p.clan) : "—"}
                      </td>
                      <td className="p-1 align-middle text-right font-weight-bold">{p.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}

function Leaderboard({
  leaderboard,
  roundsCount,
  currentRoundPosition,
  isFinished,
  currentUserId,
}) {
  const rounds = useMemo(() => {
    if (!Number.isInteger(roundsCount) || roundsCount < 1) return [];
    return Array.from({ length: roundsCount }, (_, i) => i + 1);
  }, [roundsCount]);

  const [activeTab, setActiveTab] = useState("rating");

  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    return null;
  }

  return (
    <div className="cb-bg-panel shadow-sm p-3 cb-rounded overflow-auto">
      <div className="my-2">
        <div className="d-flex flex-column flex-grow-1 position-relative py-2 mh-100 rounded-left">
          <div className="d-flex justify-content-between border-bottom cb-border-color pb-2 px-3">
            <span className="font-weight-bold">{i18n.t("Leaderboard")}</span>
            {Number.isInteger(currentRoundPosition) && Number.isInteger(roundsCount) && (
              <span className="text-muted small">
                {`${i18n.t("Round")} ${currentRoundPosition}/${roundsCount}`}
              </span>
            )}
          </div>
          <div className="d-flex flex-wrap px-3 pt-2">
            <button
              type="button"
              className={tabBtnClass(activeTab === "rating")}
              onClick={() => setActiveTab("rating")}
            >
              {i18n.t("Leaderboard")}
            </button>
            {rounds.map((r) => (
              <button
                key={`tab-${r}`}
                type="button"
                className={tabBtnClass(activeTab === `round-${r}`)}
                onClick={() => setActiveTab(`round-${r}`)}
              >
                {roundLabel(r)}
              </button>
            ))}
          </div>
          {activeTab !== "rating" ? (
            <div className="px-3 py-2">
              <SliceRoundView
                leaderboard={leaderboard}
                roundNumber={Number(activeTab.replace("round-", ""))}
                currentUserId={currentUserId}
              />
            </div>
          ) : (
            <div className="d-flex cb-overflow-x-auto">
              <table className="table cb-text-light table-striped cb-custom-event-table m-1">
                <thead>
                  <tr>
                    <th className="p-1 pl-4 font-weight-light border-0">#</th>
                    <th className="p-1 pl-4 font-weight-light border-0">{i18n.t("Player")}</th>
                    <th className="p-1 pl-4 font-weight-light border-0">{i18n.t("Clan")}</th>
                    <th className="p-1 pl-4 font-weight-light border-0 text-center">
                      {i18n.t("Slice")}
                    </th>
                    {rounds.map((r) => (
                      <th
                        key={`r-${r}`}
                        className="p-1 pl-4 font-weight-light border-0 text-center"
                      >
                        {r === 1 ? i18n.t("Seed") : `R${r - 1}`}
                      </th>
                    ))}
                    <th className="p-1 pl-4 font-weight-light border-0 text-center text-nowrap">
                      {i18n.t("Total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const place = index + 1;
                    const isLeft = entry.state === "left";
                    const isMe = Number.isInteger(currentUserId) && entry.userId === currentUserId;
                    return (
                      <React.Fragment key={entry.userId}>
                        <tr className="cb-custom-event-empty-space-tr" />
                        <tr
                          className={cn(trClassName(place), { "text-muted": isLeft })}
                          style={isMe ? { outline: "2px solid #ffc107" } : undefined}
                        >
                          <td
                            style={{
                              borderTopLeftRadius: "0.5rem",
                              borderBottomLeftRadius: "0.5rem",
                            }}
                            className={tdClassName}
                          >
                            {place}
                          </td>
                          <td className={tdClassName}>
                            <div
                              title={entry.name || `#${entry.userId}`}
                              className="cb-custom-event-name"
                              style={{
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                maxWidth: "16ch",
                              }}
                            >
                              {entry.name || `#${entry.userId}`}
                            </div>
                            {isLeft && (
                              <span className="badge badge-secondary ml-2">{i18n.t("Left")}</span>
                            )}
                          </td>
                          <td className={tdClassName}>
                            <div
                              title={entry.clan || ""}
                              style={{
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                maxWidth: "16ch",
                              }}
                            >
                              {entry.clan || "—"}
                            </div>
                          </td>
                          <td className={cn(tdClassName, "text-center")}>
                            {Number.isInteger(entry.sliceIndex) ? entry.sliceIndex + 1 : "—"}
                          </td>
                          {rounds.map((r) => {
                            const cell = entry.rounds && entry.rounds[r];
                            if (!cell) {
                              return (
                                <td
                                  key={`c-${entry.userId}-${r}`}
                                  className={cn(tdClassName, "text-center text-muted")}
                                >
                                  —
                                </td>
                              );
                            }
                            const sliceLabel = Number.isInteger(cell.sliceIndex)
                              ? `S${cell.sliceIndex + 1}`
                              : "";
                            const placeLabel = Number.isInteger(cell.place) ? `#${cell.place}` : "";
                            const meta = [sliceLabel, placeLabel].filter(Boolean).join("·");
                            return (
                              <td
                                key={`c-${entry.userId}-${r}`}
                                className={cn(tdClassName, "text-center")}
                                title={meta.replaceAll("·", " · ")}
                              >
                                <span className="font-weight-bold">{cell.score ?? 0}</span>
                                {meta && <span className="small ml-1">{`(${meta})`}</span>}
                              </td>
                            );
                          })}
                          <td
                            style={{
                              borderTopRightRadius: "0.5rem",
                              borderBottomRightRadius: "0.5rem",
                            }}
                            className={cn(tdClassName, "text-center font-weight-bold")}
                          >
                            {entry.totalScore ?? 0}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
