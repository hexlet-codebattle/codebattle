import React from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import {
  currentUserClanIdSelector,
  tournamentSelector,
} from '@/selectors';

const getCustomEventTrClassName = (item, selectedId) => cn(
  'text-dark font-weight-bold cb-custom-event-tr',
  {
    'cb-gold-place-bg': item?.place === 1,
    'cb-silver-place-bg': item?.place === 2,
    'cb-bronze-place-bg': item?.place === 3,
    'bg-white': !item?.place || item.place > 3,
    // 'bg-success': item.clanId && item.clanId === 1,
  },
  {
    'cb-custom-event-tr-brown-border': item.id === selectedId,
  },
);

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

const ArenaTopLeaderboardPanel = ({ taskCount, maxPlayerTasks }) => {
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const { ranking } = useSelector(tournamentSelector);

  return (
    <div
      className={cn(
        'd-flex flex-column flex-grow-1 postion-relative p-0 pt-3 px-3 mh-100 rounded-left',
        'cb-game-chat-container cb-messages-container',
      )}
    >
      <div className="d-flex justify-content-between border-bottom border-dark pb-2 px-3">
        <span className="font-weight-bold">{i18next.t('Teams')}</span>
        <span className="text-muted px-3">
          {i18next.t('Task').toLowerCase()}
          {' '}
          {`${taskCount}/${maxPlayerTasks}`}
        </span>
      </div>
      <div className="d-flex cb-overflow-x-auto">
        <table className="table table-striped cb-custom-event-table m-1">
          <thead>
            <tr>
              <th className="p-1 pl-4 font-weight-light border-0">
                {i18next.t('User')}
              </th>
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
            {ranking.map(item => (
              <React.Fragment key={item.id}>
                {item.place > 3 ? (
                  <>
                    <tr className="cb-custom-event-empty-space-tr" />
                    <tr className="cb-custom-event-empty-space-tr" />
                    <tr className="cb-custom-event-dots-space-tr" />
                  </>
                ) : (
                  <tr className="cb-custom-event-empty-space-tr" />
                )}
                <tr className={getCustomEventTrClassName(item, currentUserClanId)}>
                  <td className={tableDataCellClassName}>
                    <div
                      title={item?.userName}
                      className="cb-custom-event-name"
                      style={{ maxWidth: '135px' }}
                    >
                      {item?.userName}
                    </div>
                  </td>
                  <td className={tableDataCellClassName}>
                    <div
                      title={item?.clanlongName}
                      className="cb-custom-event-name"
                      style={{ maxWidth: '135px' }}
                    >
                      {item?.clanName}
                    </div>
                  </td>
                  <td className={tableDataCellClassName}>{item.score}</td>
                  <td className={tableDataCellClassName}>{item.place}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArenaTopLeaderboardPanel;
