import React, { memo, useMemo, useCallback } from 'react';

import ReactPaginate from 'react-paginate';
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

  const onChangePageNumber = useCallback(({ selected }) => {
    dispatch(actions.changeTournamentPageNumber(selected + 1));
  }, [dispatch]);

  const pageCount = Math.ceil(totalEntries / pageSize);

  if (totalEntries < pageSize) {
    return <></>;
  }

  return (
    <ReactPaginate
      className="d-flex justify-content-center pagination"
      forcePage={pageNumber - 1}
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
