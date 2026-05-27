import React from "react";
import cn from "classnames";
import { tdClassName } from "../../utils/groupTournament";

const LeaderboardRatingRoundCell = ({ cell }) => {
  if (!cell) {
    return (
      <td className={cn(tdClassName, "text-center text-muted")}>—</td>
    );
  }

  const sliceLabel = Number.isInteger(cell.sliceIndex)
    ? `S${cell.sliceIndex + 1}`
    : "";
  const placeLabel = Number.isInteger(cell.place) ? `#${cell.place}` : "";
  const meta = [sliceLabel, placeLabel].filter(Boolean).join("·");

  return (
    <td
      className={cn(tdClassName, "text-center")}
      title={meta.replaceAll("·", " · ")}
    >
      <span className="font-weight-bold">{cell.score ?? 0}</span>
      {meta && <span className="small ml-1">{`(${meta})`}</span>}
    </td>
  );
};

export default LeaderboardRatingRoundCell;
