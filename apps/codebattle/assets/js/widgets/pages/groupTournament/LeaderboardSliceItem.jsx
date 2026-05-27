import React from "react";
import cn from "classnames";
import i18n from "../../../i18n";
import LeaderboardSlicePlayerRow from "./LeaderboardSlicePlayerRow";

const LeaderboardSliceItem = ({ sliceIndex, players, hasCurrentUser, currentUserId }) => (
  <div
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
        {players.map((p, idx) => (
          <LeaderboardSlicePlayerRow
            key={p.userId}
            player={p}
            index={idx}
            currentUserId={currentUserId}
          />
        ))}
      </tbody>
    </table>
  </div>
);

export default LeaderboardSliceItem;
