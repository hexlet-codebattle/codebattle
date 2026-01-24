import React, {
 memo, useEffect, useMemo, useRef, useState,
} from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch, useSelector } from 'react-redux';

import { currentUserClanIdSelector, currentUserIdSelector } from '@/selectors';

import LanguageIcon from '../../components/LanguageIcon';
import {
  requestNearestRankingPage,
  requestRankingPage,
} from '../../middlewares/Tournament';

const getCustomEventTrClassName = (item, selectedId) => cn(
    'font-weight-bold cb-custom-event-tr-border',
    {
      'cb-gold-place-bg': item?.place === 1,
      'cb-silver-place-bg': item?.place === 2,
      'cb-bronze-place-bg': item?.place === 3,
      'cb-bg-panel': !item?.place || item?.place > 3,
    },
    {
      'cb-custom-event-tr-brown-border': item?.clanId === selectedId,
    },
  );

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

function PlayersRankingPanel({ playersCount, ranking }) {
  const dispatch = useDispatch();
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const currentUserId = useSelector(currentUserIdSelector);
  const requestedNearestPage = useRef(false);
  const requestedFirstPage = useRef(false);
  const manualPageChange = useRef(false);

  const rankingItems = useMemo(() => ranking?.entries || [], [ranking?.entries]);
  const pageNumber = ranking?.pageNumber || 1;
  const totalEntries = ranking?.totalEntries || 0;
  const displayPageSize = 16;
  const [localPageNumber, setLocalPageNumber] = useState(1);

  const isServerPaged = totalEntries > 0
    || playersCount > displayPageSize
    || rankingItems.length > displayPageSize;
  const effectivePageNumber = isServerPaged ? pageNumber : localPageNumber;
  const effectivePageSize = displayPageSize;
  const fallbackTotalEntries = playersCount || rankingItems.length;
  const effectiveTotalEntries = isServerPaged && totalEntries > 0 ? totalEntries : fallbackTotalEntries;
  const pagedRankingItems = isServerPaged
    ? rankingItems.slice(0, displayPageSize)
    : rankingItems.slice(
        (effectivePageNumber - 1) * displayPageSize,
        effectivePageNumber * displayPageSize,
      );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(effectiveTotalEntries / effectivePageSize)),
    [effectivePageSize, effectiveTotalEntries],
  );
  const canGoPrev = effectivePageNumber > 1;
  const canGoNext = effectivePageNumber < totalPages;
  const maxPageButtons = 7;
  const pageButtons = useMemo(() => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxPageButtons / 2);
    let start = Math.max(1, effectivePageNumber - halfWindow);
    const end = Math.min(totalPages, start + maxPageButtons - 1);

    if (end - start + 1 < maxPageButtons) {
      start = Math.max(1, end - maxPageButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [effectivePageNumber, totalPages]);

  useEffect(() => {
    if (!isServerPaged && effectivePageNumber > totalPages) {
      setLocalPageNumber(1);
    }
  }, [effectivePageNumber, isServerPaged, totalPages]);

  useEffect(() => {
    if (
      requestedFirstPage.current
      || manualPageChange.current
    ) {
      return;
    }

    if (rankingItems.length === 0 && playersCount > 0) {
      requestedFirstPage.current = true;
      dispatch(requestRankingPage(1, effectivePageSize));
    }
  }, [
    dispatch,
    effectivePageSize,
    playersCount,
    rankingItems.length,
  ]);

  useEffect(() => {
    if (
      !currentUserId
      || requestedNearestPage.current
      || manualPageChange.current
    ) {
      return;
    }

    const hasUserInList = rankingItems.length > 0
      && rankingItems.some(({ id }) => id === currentUserId);
    const pageSizeMismatch = ranking?.pageSize && Number(ranking.pageSize) !== displayPageSize;

    if (pageSizeMismatch || (rankingItems.length > 0 && !hasUserInList)) {
      requestedNearestPage.current = true;
      dispatch(requestNearestRankingPage(currentUserId, effectivePageSize));
    }
  }, [
    currentUserId,
    dispatch,
    ranking,
    rankingItems,
    effectivePageSize,
    displayPageSize,
    manualPageChange,
  ]);

  const handlePageChange = (nextPage) => {
    if (
      nextPage === effectivePageNumber
      || nextPage < 1
      || nextPage > totalPages
    ) {
      return;
    }
    manualPageChange.current = true;
    if (isServerPaged) {
      dispatch(requestRankingPage(nextPage, effectivePageSize));
    } else {
      setLocalPageNumber(nextPage);
    }
  };

  return (
    <div className="cb-bg-panel shadow-sm p-3 cb-rounded overflow-auto">
      <div className="my-2">
        {playersCount === 0 ? (
          <p className="text-nowrap text-muted">
            {i18next.t('No players yet')}
            .
          </p>
        ) : (
          rankingItems.length !== 0 && (
            <div
              className={cn(
                'd-flex flex-column flex-grow-1 postion-relative py-2 mh-100 rounded-left',
              )}
            >
              <div className="d-flex justify-content-between border-bottom cb-border-color pb-2 px-3">
                <span className="font-weight-bold">{i18next.t('Ranking')}</span>
                <span className="text-muted small">
                  {i18next.t('Page')}
                  {' '}
                  {effectivePageNumber}
                  {' '}
                  {i18next.t('of')}
                  {' '}
                  {totalPages}
                </span>
              </div>
              <div className="d-flex cb-overflow-x-auto">
                <table className="table cb-text table-striped cb-custom-event-table m-1">
                  <colgroup>
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '18%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="p-1 pl-4 font-weight-light border-0">
                        {i18next.t('Place')}
                      </th>
                      <th className="p-1 pl-4 font-weight-light border-0">
                        {i18next.t('Player')}
                      </th>
                      <th className="p-1 pl-4 font-weight-light border-0">
                        {i18next.t('Clan')}
                      </th>
                      <th className="p-1 pl-4 font-weight-light border-0">
                        {i18next.t('Score')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRankingItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className="cb-custom-event-empty-space-tr" />
                        <tr
                          className={getCustomEventTrClassName(
                            item,
                            currentUserClanId,
                          )}
                        >
                          <td
                            style={{
                              borderTopLeftRadius: '0.5rem',
                              borderBottomLeftRadius: '0.5rem',
                            }}
                            className={tableDataCellClassName}
                          >
                            {item.place}
                          </td>
                          <td className={tableDataCellClassName}>
                            <div
                              title={item?.name}
                              className="cb-custom-event-name"
                              style={{
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                maxWidth: '20ch',
                              }}
                            >
                              {item?.lang && (
                                <LanguageIcon
                                  className="mr-1"
                                  lang={item.lang}
                                />
                              )}
                              {(item?.name ?? '').slice(0, 10)
                                + ((item?.name?.length ?? 0) > 10 ? '..' : '')}
                            </div>
                          </td>
                          <td className={tableDataCellClassName}>
                            <div
                              title={item?.clan}
                              className="cb-custom-event-name"
                              style={{
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                maxWidth: '20ch',
                              }}
                            >
                              {(item?.clan ?? '').slice(0, 10)
                                + ((item?.clan?.length ?? 0) > 10 ? '...' : '')}
                            </div>
                          </td>
                          <td className={tableDataCellClassName}>
                            {item.score}
                          </td>
                          <td
                            style={{
                              borderTopRightRadius: '0.5rem',
                              borderBottomRightRadius: '0.5rem',
                            }}
                            className={tableDataCellClassName}
                            aria-label={i18next.t('Row spacer')}
                          />
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
      <div className="d-flex align-items-center flex-wrap justify-content-start">
        <h6 className="mb-2 mr-5 text-nowrap">
          {`${i18next.t('Total players')}: ${playersCount}`}
        </h6>
        {playersCount > 0 && (
          <div className="d-flex align-items-center mb-2 cb-ranking-pagination">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-ranking-page-btn"
              disabled={!canGoPrev}
              onClick={() => handlePageChange(1)}
              aria-label={i18next.t('First page')}
            >
              «
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-ranking-page-btn"
              disabled={!canGoPrev}
              onClick={() => handlePageChange(effectivePageNumber - 1)}
              aria-label={i18next.t('Previous page')}
            >
              ‹
            </button>
            <div className="d-flex align-items-center">
              {pageButtons.map((page) => (
                <button
                  type="button"
                  key={`ranking-page-${page}`}
                  className={cn('btn btn-sm cb-ranking-page-btn', {
                    'btn-secondary': page === effectivePageNumber,
                    'btn-outline-secondary': page !== effectivePageNumber,
                  })}
                  onClick={() => handlePageChange(page)}
                  disabled={page === effectivePageNumber}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-ranking-page-btn"
              disabled={!canGoNext}
              onClick={() => handlePageChange(effectivePageNumber + 1)}
              aria-label={i18next.t('Next page')}
            >
              ›
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-ranking-page-btn"
              disabled={!canGoNext}
              onClick={() => handlePageChange(totalPages)}
              aria-label={i18next.t('Last page')}
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PlayersRankingPanel);
