import React, { memo, useMemo, useCallback } from 'react';

import Pagination from 'react-js-pagination';
import { useDispatch, useSelector } from 'react-redux';

import { tournamentPlayersSelector } from '../../selectors';
import { actions } from '../../slices';

function TournamentPlayersPagination({ pageNumber, pageSize }) {
  const dispatch = useDispatch();

  const players = useSelector(tournamentPlayersSelector);
  const totalEntries = useMemo(() => Object.keys(players).length, [players]);

  const onChangePageNumber = useCallback(page => {
    dispatch(actions.changeTournamentPageNumber(page));
  }, [dispatch]);

  if (totalEntries < pageSize) {
    return <></>;
  }

  return (
    <Pagination
      innerClass="d-flex justify-content-center pagination"
      activePage={pageNumber}
      itemsCountPerPage={pageSize}
      totalItemsCount={totalEntries}
      pageRangeDisplayed={5}
      prevPageText="<"
      firstPageText="<<"
      lastPageText=">>"
      nextPageText=">"
      onChange={onChangePageNumber}
      itemClass="page-item"
      linkClass="page-link"
    />
  );
}

export default memo(TournamentPlayersPagination);
