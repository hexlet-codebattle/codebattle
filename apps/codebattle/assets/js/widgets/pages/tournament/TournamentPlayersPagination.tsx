import React, { memo, useMemo, useCallback, useEffect } from 'react';

import { Pagination, Group } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import { currentUserCanModerateTournament, tournamentSelector } from '../../selectors';
import { actions } from '../../slices';

interface TournamentPlayersPaginationProps {
  pageNumber: number;
  pageSize: number;
  totalEntriesOverride?: number;
}

function TournamentPlayersPagination({
  pageNumber,
  pageSize,
  totalEntriesOverride,
}: TournamentPlayersPaginationProps) {
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
    (page: number) => {
      if (page !== safePageNumber) {
        dispatch(actions.changeTournamentPageNumber(page));
      }
    },
    [dispatch, safePageNumber],
  );

  if (!Number.isFinite(pageCount) || pageCount <= 1) {
    return <></>;
  }

  return (
    <Group justify="center" my="sm">
      <Pagination
        value={safePageNumber}
        total={pageCount}
        onChange={onChangePageNumber}
        withEdges
      />
    </Group>
  );
}

export default memo(TournamentPlayersPagination);
