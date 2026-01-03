import React, { memo } from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { currentUserClanIdSelector } from '@/selectors';

const getCustomEventTrClassName = (item, selectedId) => cn(
    'font-weight-bold cb-custom-event-tr-border',
    {
      'text-dark cb-gold-place-bg': item?.place === 1,
      'text-dark cb-silver-place-bg': item?.place === 2,
      'text-dark cb-bronze-place-bg': item?.place === 3,
      'cb-bg-panel': !item?.place || item?.place > 3,
    },
    {
      'cb-custom-event-tr-brown-border': item?.clanId === selectedId,
    },
  );

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

function FinishedLeaderboard({ leaderboard }) {
  const currentUserClanId = useSelector(currentUserClanIdSelector);

  return (
    <div className="cb-bg-panel shadow-sm p-3 cb-rounded overflow-auto">
      <div className="my-2">
        <div
          className={cn(
            'd-flex flex-column flex-grow-1 postion-relative py-2 mh-100 rounded-left',
          )}
        >
          <div className="d-flex justify-content-between border-bottom cb-border-color pb-2 px-3">
            <span className="font-weight-bold">{i18next.t('Leaderboard')}</span>
          </div>
          <div className="d-flex cb-overflow-x-auto">
            <table className="table cb-text table-striped cb-custom-event-table m-1">
              <thead>
                <tr>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Place')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('User')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Lang')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Score')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Wins')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Games')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Avg Result %')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Total Time')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item) => (
                  <React.Fragment key={item.userId}>
                    {item.place > 3 ? (
                      <>
                        <tr className="cb-custom-event-empty-space-tr" />
                        <tr className="cb-custom-event-empty-space-tr" />
                        <tr className="cb-custom-event-dots-space-tr" />
                      </>
                    ) : (
                      <tr className="cb-custom-event-empty-space-tr" />
                    )}
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
                          title={item?.userName}
                          className="cb-custom-event-name"
                          style={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            maxWidth: '13ch',
                          }}
                        >
                          {(item?.userName ?? '').slice(0, 9)
                            + ((item?.userName?.length ?? 0) > 11 ? '...' : '')}
                        </div>
                      </td>
                      <td className={tableDataCellClassName}>
                        {item?.userLang?.toUpperCase() || '-'}
                      </td>
                      <td className={tableDataCellClassName}>{item.score}</td>
                      <td className={tableDataCellClassName}>
                        {item.winsCount}
                      </td>
                      <td className={tableDataCellClassName}>
                        {item.gamesCount}
                      </td>
                      <td className={tableDataCellClassName}>
                        {parseFloat(item.avgResultPercent).toFixed(1)}
                        %
                      </td>
                      <td
                        style={{
                          borderTopRightRadius: '0.5rem',
                          borderBottomRightRadius: '0.5rem',
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
    </div>
  );
}

export default memo(FinishedLeaderboard);
