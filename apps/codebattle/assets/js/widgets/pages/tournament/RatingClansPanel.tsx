import React, { memo, useState, useCallback } from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch } from 'react-redux';

import { type AppDispatch } from '@/slices';

import UserInfo from '../../components/UserInfo';
import { getResults } from '../../middlewares/Tournament';

import TournamentContextMenu, { useTournamentContextMenu } from './TournamentContextMenu';
import useTournamentPanel from './useTournamentPanel';

const getCustomEventTrClassName = (type: string, muted: boolean) =>
  cn('cb-text-light font-weight-bold cb-custom-event-tr', {
    'cb-custom-event-bg-success': type === 'clan' && !muted,
    'cb-custom-event-bg-muted-success': type === 'clan' && muted,
    'cb-custom-event-bg-purple cursor-pointer': type === 'user' && !muted,
    'cb-custom-event-bg-muted-purple cursor-pointer': type === 'user' && muted,
  });

const tableDataCellClassName = (hideSeparator?: boolean) =>
  cn('p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0', {
    'hide-separator': hideSeparator,
  });

interface ClanUser {
  userId: number;
  userName: string;
  clanId: number;
  clanRank: number;
  clanName?: string;
  clanLongName?: string;
  totalScore: number;
  winsCount: number;
  totalDurationSec: number;
}

interface RatingClansPanelProps {
  type: string;
  state: string;
  handleUserSelectClick: (event: React.MouseEvent | React.KeyboardEvent) => void;
}

function RatingClansPanel({ type, state, handleUserSelectClick }: RatingClansPanelProps) {
  const dispatch = useDispatch<AppDispatch>();

  const [items, setItems] = useState<ClanUser[][]>([]);

  const fetchData = useCallback(
    () => dispatch(getResults(type, {}, setItems)),
    [setItems, dispatch, type],
  );

  useTournamentPanel(fetchData, state);

  const { menuId, menuRequest } = useTournamentContextMenu({
    type: 'user',
  });

  return (
    <TournamentContextMenu menuId={menuId} request={menuRequest}>
      <div className="my-2 px-1 mt-lg-0 rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto">
        <table className="table table-striped cb-custom-event-table">
          <thead className="text-muted">
            <tr>
              <th className="p-1 pl-4 font-weight-light border-0">{}</th>
              <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Clan')}</th>
              <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Score')}</th>
              <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Wins count')}</th>
              <th className="p-1 pl-4 font-weight-light border-0">
                {i18next.t('Total time for solving task')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items?.map((users, index) => (
              <React.Fragment key={`${type}-clan-${users[0].clanId}`}>
                <tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
                <tr className={getCustomEventTrClassName('clan', index > 3)}>
                  <td className={tableDataCellClassName(true)}>{users[0].clanRank}</td>
                  <td title={users[0].clanLongName} className={tableDataCellClassName()}>
                    <div className="cb-custom-event-name mr-1">{users[0].clanName}</div>
                  </td>
                  <td className={tableDataCellClassName()}>
                    {users.reduce((acc, user) => acc + user.totalScore, 0) || 0}
                  </td>
                  <td className={tableDataCellClassName()}>
                    {users.reduce((acc, user) => acc + user.winsCount, 0) || 0}
                  </td>
                  <td className={tableDataCellClassName()}>
                    {users.reduce((acc, user) => acc + user.totalDurationSec, 0) || 0}
                  </td>
                </tr>
                {users.map((user) => (
                  <React.Fragment key={`${type}-user-${user.userId}`}>
                    <tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
                    <tr className={getCustomEventTrClassName('user', index > 3)}>
                      <td className={tableDataCellClassName(true)} aria-label="User row" />
                      <td className={tableDataCellClassName()}>
                        <div
                          role="button"
                          tabIndex={0}
                          className="cb-custom-event-name cursor-pointer mr-1 text-secondary"
                          // onContextMenu={displayMenu}
                          onClick={handleUserSelectClick}
                          onKeyPress={handleUserSelectClick}
                          data-user-id={user.userId}
                          data-user-name={user.userName}
                        >
                          {/* UserInfo currently types className/displayName/lang as required;
                              they are optional at runtime, so omit them here. */}
                          <UserInfo
                            user={{ id: user.userId, name: user.userName }}
                            hideOnlineIndicator
                            hideLink
                            linkClassName="text-secondary"
                            className={undefined}
                            displayName={undefined}
                            lang={undefined}
                          />
                        </div>
                      </td>
                      <td className={tableDataCellClassName()}>{user.totalScore || 0}</td>
                      <td className={tableDataCellClassName()}>{user.winsCount || 0}</td>
                      <td className={tableDataCellClassName()}>{user.totalDurationSec || 0}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </TournamentContextMenu>
  );
}

export default memo(RatingClansPanel);
