import React, { useMemo } from "react";

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

function Leaderboard({ leaderboard, roundsCount, currentRoundPosition, isFinished }) {
  const rounds = useMemo(() => {
    if (!Number.isInteger(roundsCount) || roundsCount < 1) return [];
    return Array.from({ length: roundsCount }, (_, i) => i + 1);
  }, [roundsCount]);

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
                    <th key={`r-${r}`} className="p-1 pl-4 font-weight-light border-0 text-center">
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
                  return (
                    <React.Fragment key={entry.userId}>
                      <tr className="cb-custom-event-empty-space-tr" />
                      <tr className={cn(trClassName(place), { "text-muted": isLeft })}>
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
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
