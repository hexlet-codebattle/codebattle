import React from 'react';

import cn from 'classnames';
import i18next from 'i18next';

const getCustomEventTrClassName = (item, selectedId) => (
  cn(
    'text-dark font-weight-bold cb-custom-event-tr',
    {
      'cb-gold-place-bg': item?.place === 1,
      'cb-silver-place-bg': item?.place === 2,
      'cb-bronze-place-bg': item?.place === 3,
      'bg-white': !item?.place || item.place > 3,
    },
    {
      'cb-custom-event-tr-brown-border': item.id === selectedId,
    },
  )
);

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

const TopLeaderboardPanel = ({
  topLeaderboard = [],
  selectedId,
}) => (
  <div className="d-flex flex-column">
    <div className="d-flex w-100 font-weight-bold justify-content-between border-bottom border-dark pb-2">
      <span>{i18next.t('Top-3')}</span>
      <span className="px-3">{i18next.t('Total number of teams %{count}', { count: 3 })}</span>
    </div>
    <div className="d-flex w-100 pt-3 cb-overflow-x-auto">
      <table
        className="table table-striped cb-custom-event-table"
      >
        <thead className="text-muted">
          <tr>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Place')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Score')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Clan players count')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Clan')}</th>
          </tr>
        </thead>
        <tbody>
          {topLeaderboard.map(item => (
            <React.Fragment key={item.id}>
              <tr className="cb-custom-event-empty-space-tr" />
              <tr className={getCustomEventTrClassName(item, selectedId)}>
                <td width="122" className={tableDataCellClassName}>
                  {item.place}
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.score}
                </td>
                <td className={tableDataCellClassName}>
                  {item.playersCount}
                </td>
                <td title={item.clanName} className={tableDataCellClassName}>
                  <div className="cb-custom-event-name" style={{ maxWidth: 220 }}>
                    {item.clanName}
                  </div>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default TopLeaderboardPanel;
