import React, { memo } from 'react';

import cn from 'classnames';
import i18next from 'i18next';

const getTopItemClassName = item => (
  cn('text-dark font-weight-bold cb-custom-event-tr', {
    // 'cb-gold-place-bg': item?.place === 1,
    // 'cb-silver-place-bg': item?.place === 2,
    // 'cb-bronze-place-bg': item?.place === 3,
    'bg-white': !item?.place || item.place > 3,
    // 'bg-success': item.clanId && item.clanId === 1,
  })
);

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

function TournamentClanTable({ items }) {
  return (
    <div className="my-2 mt-lg-0 sticky-top bg-white rounded-lg position-relative">
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
          {items.map(item => (
            <React.Fragment key={item.userId || item.clanId}>
              <tr className="cb-custom-event-empty-space-tr" />
              <tr className={getTopItemClassName(item)}>
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
  );
}

export default memo(TournamentClanTable);
