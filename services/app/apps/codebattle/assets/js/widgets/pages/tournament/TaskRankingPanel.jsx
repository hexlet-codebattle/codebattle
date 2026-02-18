import React, { memo, useState, useCallback } from "react";

import cn from "classnames";
import i18next from "i18next";
import { useDispatch } from "react-redux";

import { getResults } from "../../middlewares/Tournament";

import useTournamentPanel from "./useTournamentPanel";

const getCustomEventTrClassName = (level) =>
  cn("cb-text-light font-weight-bold cb-custom-event-tr cursor-pointer", {
    "cb-custom-event-bg-success": level === "easy",
    "cb-custom-event-bg-orange": level === "elementary",
    "cb-custom-event-bg-blue": level === "medium",
    "cb-custom-event-bg-brown": level === "hard",
  });

const tableDataCellClassName = cn(
  "p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0",
);

function TaskRankingPanel({ type, state, handleTaskSelectClick }) {
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);

  const fetchData = useCallback(
    () => dispatch(getResults(type, {}, setItems)),
    [setItems, dispatch, type],
  );

  useTournamentPanel(fetchData, state);

  return (
    <div className="my-2 px-1 mt-lg-0 cb-rounded position-relative cb-overflow-x-auto cb-overflow-y-auto">
      <table className="table table-striped cb-custom-event-table">
        <thead className="text-muted">
          <tr>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t("Task")}</th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t("Count of solutions")}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t("Fastest time to solve task (sec)")}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t("%{percent}% (sec)", { percent: 25 })}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t("%{percent}% (sec)", { percent: 50 })}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t("%{percent}% (sec)", { percent: 75 })}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t("%{percent}% (sec)", { percent: 85 })}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t("%{percent}% (sec)", { percent: 95 })}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t("Slowest time to solve task (sec)")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <React.Fragment key={`${type}-task-${item.taskId}`}>
              <tr className="cb-custom-event-empty-space-tr" />
              <tr
                onClick={handleTaskSelectClick}
                data-task-id={item.taskId}
                className={getCustomEventTrClassName(item.level)}
              >
                <td title={item.name} className={tableDataCellClassName}>
                  <div className="cb-custom-event-name mr-1">{item.name}</div>
                </td>
                <td className={tableDataCellClassName}>{item.winsCount}</td>
                <td className={tableDataCellClassName}>{item.min}</td>
                <td className={tableDataCellClassName}>{item.p5}</td>
                <td className={tableDataCellClassName}>{item.p25}</td>
                <td className={tableDataCellClassName}>{item.p50}</td>
                <td className={tableDataCellClassName}>{item.p75}</td>
                <td className={tableDataCellClassName}>{item.p95}</td>
                <td className={tableDataCellClassName}>{item.max}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(TaskRankingPanel);
