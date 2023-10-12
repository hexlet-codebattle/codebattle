import React, { memo } from 'react';

import Pagination from 'react-js-pagination';
import { useDispatch, useSelector } from 'react-redux';

import { changeTournamentPlayersList } from '../../middlewares/Tournament';

function TournamentPlayersPagination() {
  const dispatch = useDispatch();

  const pageNumber = useSelector(state => state.tournament.playersPageNumber);
  const pageSize = useSelector(state => state.tournament.playersPageSize);
  const totalEntries = useSelector(state => state.tournament.playersCount);

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
      onChange={page => {
        dispatch(changeTournamentPlayersList(page));
      }}
      itemClass="page-item"
      linkClass="page-link"
    />
  );
}

export default memo(TournamentPlayersPagination);
