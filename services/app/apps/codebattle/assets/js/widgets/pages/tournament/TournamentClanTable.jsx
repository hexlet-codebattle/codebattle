import React, { memo } from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

const getTopItemClassName = item => cn('text-dark font-weight-bold cb-custom-event-tr', {
    'cb-gold-place-bg': item?.place === 1,
    'cb-silver-place-bg': item?.place === 2,
    'cb-bronze-place-bg': item?.place === 3,
    'bg-white': !item?.place || item.place > 3,
  });

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

function TournamentClanTable() {
  const { clans, ranking } = useSelector(state => state.tournament);
  if (!ranking || !ranking.entries || ranking.entries.length === 0) {
    return (<> </>);
  }

  return (
    <div className="my-2 mt-lg-0 sticky-top rounded-lg position-relative cb-overflow-x-auto">
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
            {/* <th className="p-1 pl-4 font-weight-light border-0"> */}
            {/*   {i18next.t('Clan players count')} */}
            {/* </th> */}
          </tr>
        </thead>
        <tbody>
          {ranking.entries.map(item => (
            <React.Fragment key={item.id}>
              <tr className="cb-custom-event-empty-space-tr" />
              <tr className={getTopItemClassName(item)}>
                <td
                  title={clans[item.id]?.longName}
                  className={tableDataCellClassName}
                >
                  <div
                    className="cb-custom-event-name"
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
                {/* <td className={tableDataCellClassName}>{item.playersCount}</td> */}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(TournamentClanTable);
