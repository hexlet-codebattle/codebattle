import React, { memo, useMemo, useCallback } from 'react';

import Pagination from 'react-js-pagination';
import { useDispatch, useSelector } from 'react-redux';

import {
  currentUserIsAdminSelector,
  currentUserIsTournamentOwnerSelector,
  tournamentSelector,
} from '../../selectors';
import { actions } from '../../slices';

function TournamentPlayersPagination({ pageNumber, pageSize }) {
  const dispatch = useDispatch();

  const { players, topPlayerIds } = useSelector(tournamentSelector);
  const isAdmin = useSelector(currentUserIsAdminSelector);
  const isOwner = useSelector(currentUserIsTournamentOwnerSelector);
  const totalEntries = useMemo(
    () => {
      if (topPlayerIds.length === 0 || isAdmin || isOwner) {
        return Object.keys(players).length;
      }

      return topPlayerIds.length;
    },
    [players, isAdmin, isOwner, topPlayerIds],
  );

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
