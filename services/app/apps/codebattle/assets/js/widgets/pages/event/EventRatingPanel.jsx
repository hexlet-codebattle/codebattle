import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import groupBy from 'lodash/groupBy';
import { useDispatch } from 'react-redux';

import { actions } from '../../slices';

import LeaderboardPagination from './LeaderboardPagination';

const getCustomEventTrClassNamePersonal = (type, muted, isUser) => cn('text-dark font-weight-bold cb-custom-event-tr', {
    'cb-custom-event-bg-success': type === 'clan' && !muted,
    'cb-custom-event-bg-muted-success': type === 'clan' && muted,
    'cb-custom-event-bg-purple': type === 'user' && !muted,
    'cb-custom-event-bg-muted-purple': type === 'user' && muted,
    'cb-custom-event-tr-brown-border': isUser,
  });

const tableDataCellClassNamePersonal = hideSeparator => cn(
    'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
    {
      'hide-separator': hideSeparator,
    },
  );

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

const navTabsClassName = cn(
  'nab nab-tabs d-flex flex-nowrap cb-overflow-x-auto cb-overlfow-y-hidden',
  'rounded-top',
);

const getTabLinkClassName = isActive => cn(
    'nav-item nav-link cb-custom-event-nav-item position-relative',
    'text-nowrap text-white rounded-0 p-2 px-3 border-0 w-100 bg-gray',
    {
      active: isActive,
      'cb-custom-event-common-leaderboard-bg text-dark font-weight-bold':
        isActive,
    },
  );

const getCustomEventTrClassName = (item, selectedId) => cn(
    'text-dark font-weight-bold cb-custom-event-tr',
    {
      'cb-gold-place-bg': item?.place === 1,
      'cb-silver-place-bg': item?.place === 2,
      'cb-bronze-place-bg': item?.place === 3,
      'bg-white': !item?.place || item.place > 3,
    },
    {
      'cb-custom-event-tr-brown-border': item.userId
        ? item.userId === selectedId
        : item.clanId === selectedId,
    },
  );

const commonRatingTypes = {
  personal: 'personal',
  clan: 'clan',
  player: 'player',
  playerClan: 'player_clan',
};

const maxTopClansCount = 4;
const maxTopPlayersCount = 5;

const EventRatingPanel = ({
  commonLeaderboard: {
    items, pageNumber, pageSize, totalEntries,
  } = {
    items: [],
    pageNumber: 1,
    pageSize: 15,
    totalEntries: 0,
  },
  currentUserClanId,
  currentUserId,
  showPersonal,
  eventId,
}) => {
  const dispatch = useDispatch();

  const [type, setType] = useState(
    showPersonal ? commonRatingTypes.personal : commonRatingTypes.clan,
  );
  const selectedId = type === commonRatingTypes.clan ? currentUserClanId : currentUserId;
  const handleChangePanelTypeClick = useCallback(
    e => {
      const {
        currentTarget: { dataset },
      } = e;
      setType(dataset.tabName);
    },
    [setType],
  );

  const setPage = useCallback(
    page => {
      (async () => {
        try {
          await dispatch(
            actions.fetchCommonLeaderboard({
              type,
              eventId,
              pageNumber: page,
              pageSize,
            }),
          );
        } catch (e) {
          throw new Error(e.message);
        }
      })();
    },
    [type, eventId, pageSize, dispatch],
  );

  useEffect(() => {
    (async () => {
      try {
        await dispatch(
          actions.fetchCommonLeaderboard({
            type,
            eventId,
          }),
        );
      } catch (e) {
        throw new Error(e.message);
      }
    })();
    /* eslint-disable-next-line */
  }, [type]);

  useEffect(() => {
    setType(showPersonal ? commonRatingTypes.personal : commonRatingTypes.clan);
  }, [showPersonal]);

  if (type === commonRatingTypes.personal) {
    const groupedItems = Object.values(groupBy(items, item => item.clanRank));

    return (
      <div className="mt-lg-0 rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto bg-white rounded-lg py-2 px-1">
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
            {groupedItems?.map((users, clanIndex) => (
              <React.Fragment key={`${type}-clan-${users[0].clanId}`}>
                <tr className="cb-custom-event-empty-space-tr" />
                <tr
                  className={
                    getCustomEventTrClassNamePersonal(
                      'clan',
                      clanIndex > maxTopClansCount - 1,
                      users[0].clanId === currentUserClanId,
                    )
                  }
                >
                  <td className={tableDataCellClassNamePersonal(true)}>
                    {users[0].clanRank}
                  </td>
                  <td
                    title={users[0].clanLongName}
                    className={tableDataCellClassNamePersonal()}
                  >
                    <div className="cb-custom-event-name mr-1">
                      {users[0].clanName}
                    </div>
                  </td>
                  <td className={tableDataCellClassNamePersonal()}>
                    {users.slice(0, maxTopPlayersCount).reduce((acc, user) => acc + user.totalScore, 0) || 0}
                  </td>
                  <td className={tableDataCellClassNamePersonal()}>
                    {users.slice(0, maxTopPlayersCount).reduce((acc, user) => acc + user.winsCount, 0) || 0}
                  </td>
                  <td className={tableDataCellClassNamePersonal()}>
                    {users.slice(0, maxTopPlayersCount).reduce(
                      (acc, user) => acc + user.totalDurationSec,
                      0,
                    ) || 0}
                  </td>
                </tr>
                {users.map((user, userIndex) => (
                  <React.Fragment key={`${type}-user-${user.userId}`}>
                    <tr className="cb-custom-event-empty-space-tr" />
                    <tr
                      className={getCustomEventTrClassNamePersonal(
                        'user',
                        clanIndex > maxTopClansCount - 1 || userIndex > maxTopPlayersCount - 1,
                        user.userId === currentUserId,
                      )}
                    >
                      <td className={tableDataCellClassNamePersonal(true)} />
                      <td className={tableDataCellClassNamePersonal()}>
                        <div style={{ maxWidth: 200 }} className="cb-custom-event-name mr-1">
                          {user.userName}
                        </div>
                      </td>
                      <td className={tableDataCellClassNamePersonal()}>
                        {user.totalScore || 0}
                      </td>
                      <td className={tableDataCellClassNamePersonal()}>
                        {user.winsCount || 0}
                      </td>
                      <td className={tableDataCellClassNamePersonal()}>
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
  return (
    <>
      <div className="d-flex flex-column">
        <div className="d-flex w-100 justify-content-starts border-bottom border-dark pb-2">
          <span className="font-weight-bold">{i18next.t('Event rating')}</span>
        </div>
        <div className="d-flex flex-column w-100 mt-3 cb-custom-event-common-leaderboard-bg rounded-lg">
          <nav className="pb-2">
            <div id="nav-tab" className={navTabsClassName} role="tablist">
              <button
                type="button"
                id="clan-tab"
                className={getTabLinkClassName(type === commonRatingTypes.clan)}
                role="tab"
                data-tab-name="clan"
                onClick={handleChangePanelTypeClick}
              >
                {i18next.t('Clans rating')}
              </button>
              <button
                type="button"
                id="player-tab"
                className={getTabLinkClassName(
                  type === commonRatingTypes.player,
                )}
                role="tab"
                data-tab-name="player"
                onClick={handleChangePanelTypeClick}
              >
                {i18next.t('Players rating')}
              </button>
              <button
                type="button"
                id="clan-player-tab"
                className={getTabLinkClassName(
                  type === commonRatingTypes.playerClan,
                )}
                role="tab"
                data-tab-name="player_clan"
                onClick={handleChangePanelTypeClick}
              >
                {i18next.t('Clan players rating')}
              </button>
            </div>
          </nav>
          <div className="px-3 cb-overflow-x-auto">
            <table className="table table-striped cb-custom-event-table mt-3">
              <thead className="text-muted">
                <tr>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Place')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Score')}
                  </th>
                  {type === commonRatingTypes.clan && (
                    <th className="p-1 pl-4 font-weight-light border-0">
                      {i18next.t('Clan players_count/registrations')}
                    </th>
                  )}
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Clan')}
                  </th>
                  {type !== commonRatingTypes.clan && (
                    <th className="p-1 pl-4 font-weight-light border-0">
                      {i18next.t('Login')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items?.map(item => (
                  <React.Fragment key={`${type}${item.clanId}${item.userId}`}>
                    <tr className="cb-custom-event-empty-space-tr" />
                    <tr className={getCustomEventTrClassName(item, selectedId)}>
                      <td width="110" className={tableDataCellClassName}>
                        {item.place || '-'}
                      </td>
                      <td width="120" className={tableDataCellClassName}>
                        {item.score || '-'}
                      </td>
                      {item.eventPlayersCount !== undefined && (
                        <td className={tableDataCellClassName}>
                          {item.eventPlayersCount !== null
                            ? `${item.eventPlayersCount}/${item.clansPlayersCount}`
                            : item.clansPlayersCount}
                        </td>
                      )}
                      <td
                        title={item.clanLongName}
                        className={tableDataCellClassName}
                      >
                        <div
                          className="cb-custom-event-name"
                          style={{ maxWidth: 220 }}
                        >
                          {item.clanName}
                        </div>
                      </td>
                      {item.userName && (
                        <td
                          title={item.userName}
                          className={tableDataCellClassName}
                        >
                          <div
                            className="cb-custom-event-name"
                            style={{ maxWidth: 220 }}
                          >
                            {item.userName}
                          </div>
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between mr-1 px-2">
            <div className="pl-2">
              <span>
                {i18next.t('Total entries: %{totalEntries}', { totalEntries })}
              </span>
            </div>
            <LeaderboardPagination
              pageInfo={{ pageNumber, pageSize, totalEntries }}
              setPage={setPage}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default EventRatingPanel;
