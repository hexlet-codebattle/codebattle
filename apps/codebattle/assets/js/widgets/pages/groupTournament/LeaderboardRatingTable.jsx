import React from "react";
import i18n from "../../../i18n";
import LeaderboardRatingTableRow from "./LeaderboardRatingTableRow";

const LeaderboardRatingTable = ({ leaderboard, rounds, currentUserId }) => (
  <div className="d-flex cb-overflow-x-auto">
    <table className="table cb-text-light table-striped cb-custom-event-table m-1">
      <thead>
        <tr>
          <th className="p-1 pl-4 font-weight-light border-0">#</th>
          <th className="p-1 pl-4 font-weight-light border-0">{i18n.t("Player")}</th>
          <th className="p-1 pl-4 font-weight-light border-0">{i18n.t("Clan")}</th>
          <th className="p-1 pl-4 font-weight-light border-0 text-center">{i18n.t("Slice")}</th>
          {rounds.map((r) => (
            <th key={`r-${r}`} className="p-1 pl-4 font-weight-light border-0 text-center">
              {r === 1 ? i18n.t("Seed") : i18n.t("Round %{n}", { n: r - 1 })}
            </th>
          ))}
          <th className="p-1 pl-4 font-weight-light border-0 text-center text-nowrap">
            {i18n.t("Total")}
          </th>
        </tr>
      </thead>
      <tbody>
        {leaderboard.map((entry, index) => (
          <LeaderboardRatingTableRow
            key={entry.userId}
            entry={entry}
            index={index}
            rounds={rounds}
            currentUserId={currentUserId}
          />
        ))}
      </tbody>
    </table>
  </div>
);

export default LeaderboardRatingTable;
