import React, { memo, useMemo, useCallback, useEffect } from "react";

import ReactPaginate from "react-paginate";
import { useDispatch, useSelector } from "react-redux";

import { currentUserCanModerateTournament, tournamentSelector } from "../../selectors";
import { actions } from "../../slices";

function TournamentPlayersPagination({ pageNumber, pageSize, totalEntriesOverride }) {
  const dispatch = useDispatch();

  const { players, topPlayerIds } = useSelector(tournamentSelector);
  const canModerate = useSelector(currentUserCanModerateTournament);
  const totalEntries = useMemo(() => {
    if (Number.isFinite(totalEntriesOverride)) {
      return totalEntriesOverride;
    }
    if (topPlayerIds.length === 0 || canModerate) {
      return Object.keys(players).length;
    }

    return topPlayerIds.length;
  }, [players, canModerate, topPlayerIds, totalEntriesOverride]);

  const normalizedPageSize = Number(pageSize);
  const safePageSize = normalizedPageSize > 0 ? normalizedPageSize : 20;
  const normalizedTotalEntries = Number(totalEntries);
  const safeTotalEntries = Number.isFinite(normalizedTotalEntries) ? normalizedTotalEntries : 0;
  const normalizedPageNumber = Number(pageNumber);
  const safePageNumber =
    Number.isFinite(normalizedPageNumber) && normalizedPageNumber > 0 ? normalizedPageNumber : 1;

  const pageCount = Math.ceil(safeTotalEntries / safePageSize);

  useEffect(() => {
    if (Number.isFinite(pageCount) && pageCount > 0 && safePageNumber > pageCount) {
      dispatch(actions.changeTournamentPageNumber(pageCount));
    }
  }, [dispatch, pageCount, safePageNumber]);

  const onChangePageNumber = useCallback(
    ({ selected }) => {
      const nextPage = selected + 1;
      if (nextPage !== safePageNumber) {
        dispatch(actions.changeTournamentPageNumber(nextPage));
      }
    },
    [dispatch, safePageNumber],
  );

  if (!Number.isFinite(pageCount) || pageCount <= 1) {
    return <></>;
  }

  return (
    <ReactPaginate
      className="d-flex justify-content-center pagination"
      forcePage={safePageNumber - 1}
      pageCount={pageCount}
      pageRangeDisplayed={5}
      marginPagesDisplayed={1}
      previousLabel="<"
      nextLabel=">"
      breakLabel="..."
      onPageChange={onChangePageNumber}
      pageClassName="page-item"
      pageLinkClassName="page-link"
      previousClassName="page-item"
      previousLinkClassName="page-link"
      nextClassName="page-item"
      nextLinkClassName="page-link"
      breakClassName="page-item"
      breakLinkClassName="page-link"
      activeClassName="active"
    />
  );
}

export default memo(TournamentPlayersPagination);
