import React, { memo, useState, useEffect } from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch } from 'react-redux';

import UserInfo from '../../components/UserInfo';
import { getResults } from '../../middlewares/TournamentAdmin';

const getCustomEventTrClassName = (type, muted) => cn('text-dark font-weight-bold cb-custom-event-tr', {
    'cb-custom-event-bg-success': type === 'clan' && !muted,
    'cb-custom-event-bg-muted-success': type === 'clan' && muted,
    'cb-custom-event-bg-purple': type === 'user' && !muted,
    'cb-custom-event-bg-muted-purple': type === 'user' && muted,
  });

const tableDataCellClassName = hideSeparator => cn(
    'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
    {
      'hide-separator': hideSeparator,
    },
  );

function RatingClansPanel({ type, state }) {
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (state === 'active') {
      dispatch(getResults(type, undefined, setItems));

      const interval = setInterval(() => {
        dispatch(getResults(type, undefined, setItems));
      }, 1000 * 30);

      return () => {
        clearInterval(interval);
      };
    }

    if (state === 'finished') {
      dispatch(getResults(type, undefined, setItems));
    }

    return () => {};
  }, [setItems, dispatch, type, state]);

  return (
    <div className="my-2 px-1 mt-lg-0 sticky-top rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto">
      <table className="table table-striped cb-custom-event-table">
        <thead className="text-muted">
          <tr>
            <th className="p-1 pl-4 font-weight-light border-0">{}</th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Clan')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Score')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Wins count')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Total time for solving task')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items?.map((users, index) => (
            <React.Fragment key={`${type}-clan-${users[0].clanId}`}>
              <tr className="cb-custom-event-empty-space-tr" />
              <tr className={getCustomEventTrClassName('clan', index > 3)}>
                <td className={tableDataCellClassName(true)}>
                  {users[0].clanRank}
                </td>
                <td
                  title={users[0].clanLongName}
                  className={tableDataCellClassName()}
                >
                  <div
                    className="cb-custom-event-name mr-1"
                  >
                    {users[0].clanName}
                  </div>
                </td>
                <td className={tableDataCellClassName()}>
                  {users.reduce((acc, user) => acc + user.totalScore, 0) || 0}
                </td>
                <td className={tableDataCellClassName()}>
                  {users.reduce((acc, user) => acc + user.winsCount, 0) || 0}
                </td>
                <td className={tableDataCellClassName()}>
                  {users.reduce(
                    (acc, user) => acc + user.totalDurationSec,
                    0,
                  ) || 0}
                </td>
              </tr>
              {users.map(user => (
                <React.Fragment key={`${type}-user-${user.userId}`}>
                  <tr className="cb-custom-event-empty-space-tr" />
                  <tr className={getCustomEventTrClassName('user', index > 3)}>
                    <td className={tableDataCellClassName(true)} />
                    <td className={tableDataCellClassName()}>
                      <div
                        className="cb-custom-event-name mr-1"
                      >
                        <UserInfo
                          user={{ id: user.userId, name: user.userName }}
                          hideOnlineIndicator
                        />
                      </div>
                    </td>
                    <td className={tableDataCellClassName()}>
                      {user.totalScore || 0}
                    </td>
                    <td className={tableDataCellClassName()}>
                      {user.winsCount || 0}
                    </td>
                    <td className={tableDataCellClassName()}>
                      {user.totalDurationSec || 0}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(RatingClansPanel);
