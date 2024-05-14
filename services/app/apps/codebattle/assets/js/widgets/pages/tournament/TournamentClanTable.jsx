import React, { memo } from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { currentUserClanIdSelector, tournamentSelector } from '@/selectors';

const getCustomEventTrClassName = (item, selectedId) => cn(
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
);

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

function TournamentClanTable() {
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const { clans, ranking } = useSelector(tournamentSelector);

  if (!ranking || !ranking.entries || ranking.entries.length === 0) {
    return <></>;
  }

  return (
    <div className="my-2 px-1 mt-lg-0 sticky-top rounded-lg position-relative cb-overflow-x-auto">
      <table className="table table-striped cb-custom-event-table">
        <thead className="text-muted">
          <tr>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Clan')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Score')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Place')}
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.entries.map(item => (
            <React.Fragment key={item.id}>
              <tr className="cb-custom-event-empty-space-tr" />
              <tr className={getCustomEventTrClassName(item, currentUserClanId)}>
                <td
                  title={clans[item.id]?.longName}
                  className={tableDataCellClassName}
                >
                  <div
                    className="cb-custom-event-name mr-1"
                    style={{ maxWidth: 220 }}
                  >
                    {clans[item.id]?.name}
                  </div>
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.score}
                </td>
                <td width="122" className={tableDataCellClassName}>
                  {item.place}
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
