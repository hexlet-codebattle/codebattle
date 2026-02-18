import React, { memo, useMemo, useState } from "react";

import cn from "classnames";
import i18next from "i18next";
import { useSelector } from "react-redux";

import { currentUserClanIdSelector } from "@/selectors";

import LanguageIcon from "../../components/LanguageIcon";

const getCustomEventTrClassName = (item, selectedId) =>
  cn(
    "font-weight-bold cb-custom-event-tr-border",
    {
      "cb-gold-place-bg": item?.place === 1,
      "cb-silver-place-bg": item?.place === 2,
      "cb-bronze-place-bg": item?.place === 3,
      "cb-bg-panel": !item?.place || item?.place > 3,
    },
    {
      "cb-custom-event-tr-brown-border": item?.clanId === selectedId,
    },
  );

const tableDataCellClassName = cn(
  "p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0",
);

function FinishedLeaderboard({ leaderboard }) {
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const pageSize = 16;
  const [pageNumber, setPageNumber] = useState(1);
  const totalEntries = leaderboard.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safePageNumber = Math.min(pageNumber, totalPages);
  const pagedLeaderboard = useMemo(
    () => leaderboard.slice((safePageNumber - 1) * pageSize, safePageNumber * pageSize),
    [leaderboard, pageSize, safePageNumber],
  );
  const canGoPrev = safePageNumber > 1;
  const canGoNext = safePageNumber < totalPages;
  const maxPageButtons = 7;
  const pageButtons = useMemo(() => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxPageButtons / 2);
    let start = Math.max(1, safePageNumber - halfWindow);
    const end = Math.min(totalPages, start + maxPageButtons - 1);

    if (end - start + 1 < maxPageButtons) {
      start = Math.max(1, end - maxPageButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safePageNumber, totalPages]);

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === safePageNumber) {
      return;
    }
    setPageNumber(nextPage);
  };

  return (
    <div className="cb-bg-panel shadow-sm p-3 cb-rounded overflow-auto">
      <div className="my-2">
        <div
          className={cn("d-flex flex-column flex-grow-1 postion-relative py-2 mh-100 rounded-left")}
        >
          <div className="d-flex justify-content-between border-bottom cb-border-color pb-2 px-3">
            <span className="font-weight-bold">{i18next.t("Leaderboard")}</span>
          </div>
          <div className="d-flex cb-overflow-x-auto">
            <table className="table cb-text-light table-striped cb-custom-event-table m-1">
              <thead>
                <tr>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t("Place")}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t("Player")}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t("Score")}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t("Wins")}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t("Games")}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t("Avg Result %")}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t("Total Time")}</th>
                </tr>
              </thead>
              <tbody>
                {pagedLeaderboard.map((item) => (
                  <React.Fragment key={item.userId}>
                    <tr className="cb-custom-event-empty-space-tr" />
                    <tr className={getCustomEventTrClassName(item, currentUserClanId)}>
                      <td
                        style={{
                          borderTopLeftRadius: "0.5rem",
                          borderBottomLeftRadius: "0.5rem",
                        }}
                        className={tableDataCellClassName}
                      >
                        {item.place}
                      </td>
                      <td className={tableDataCellClassName}>
                        <div
                          title={item?.userName}
                          className="cb-custom-event-name"
                          style={{
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            maxWidth: "13ch",
                          }}
                        >
                          {(item?.userLang || item?.user_lang || item?.lang) && (
                            <LanguageIcon
                              className="mr-1"
                              lang={item?.userLang || item?.user_lang || item?.lang}
                            />
                          )}
                          {(item?.userName ?? "").slice(0, 9) +
                            ((item?.userName?.length ?? 0) > 11 ? "..." : "")}
                        </div>
                      </td>
                      <td className={tableDataCellClassName}>{item.score}</td>
                      <td className={tableDataCellClassName}>{item.winsCount}</td>
                      <td className={tableDataCellClassName}>{item.gamesCount}</td>
                      <td className={tableDataCellClassName}>
                        {parseFloat(item.avgResultPercent).toFixed(1)}%
                      </td>
                      <td
                        style={{
                          borderTopRightRadius: "0.5rem",
                          borderBottomRightRadius: "0.5rem",
                        }}
                        className={tableDataCellClassName}
                      >
                        {item.totalTime}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="d-flex align-items-center flex-wrap justify-content-start">
        <h6 className="mb-2 mr-5 text-nowrap">
          {`${i18next.t("Total players")}: ${totalEntries}`}
        </h6>
        {totalPages > 1 && (
          <div className="d-flex align-items-center mb-2 cb-ranking-pagination">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-ranking-page-btn"
              disabled={!canGoPrev}
              onClick={() => handlePageChange(1)}
            >
              «
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-ranking-page-btn"
              disabled={!canGoPrev}
              onClick={() => handlePageChange(safePageNumber - 1)}
            >
              ‹
            </button>
            <div className="d-flex align-items-center">
              {pageButtons.map((page) => (
                <button
                  type="button"
                  key={`leaderboard-page-${page}`}
                  className={cn("btn btn-sm cb-ranking-page-btn", {
                    "btn-secondary": page === safePageNumber,
                    "btn-outline-secondary": page !== safePageNumber,
                  })}
                  onClick={() => handlePageChange(page)}
                  disabled={page === safePageNumber}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-ranking-page-btn"
              disabled={!canGoNext}
              onClick={() => handlePageChange(safePageNumber + 1)}
            >
              ›
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-ranking-page-btn"
              disabled={!canGoNext}
              onClick={() => handlePageChange(totalPages)}
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FinishedLeaderboard);
