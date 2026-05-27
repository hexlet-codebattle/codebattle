import React from "react";
import cn from "classnames";
import i18n from "../../../i18n";
import { trClassName, tdClassName } from "../../utils/groupTournament";
import LeaderboardRatingRoundCell from "./LeaderboardRatingRoundCell";

const LeaderboardRatingTableRow = ({ entry, index, rounds, currentUserId }) => {
  const place = index + 1;
  const isLeft = entry.state === "left";
  const isMe = Number.isInteger(currentUserId) && entry.userId === currentUserId;

  return (
    <React.Fragment>
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
          {isLeft && <span className="badge badge-secondary ml-2">{i18n.t("Left")}</span>}
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
        {rounds.map((r) => (
          <LeaderboardRatingRoundCell
            key={`c-${entry.userId}-${r}`}
            cell={entry.rounds && entry.rounds[r]}
          />
        ))}
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
};

export default LeaderboardRatingTableRow;
