import React, {
  memo,
  useState,
  useEffect,
  useCallback,
} from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch, useSelector } from 'react-redux';

// import useSearchParams from '../../utils/useSearchParams';

import Loading from '../../components/Loading';
import loadingStatuses from '../../config/loadingStatuses';
import ModalCodes from '../../config/modalCodes';
import TournamentStatusCodes from '../../config/tournament';
import {
  currentUserClanIdSelector,
  currentUserIdSelector,
  eventSelector,
} from '../../selectors';
import { actions } from '../../slices';
import TournamentDescriptionModal from '../tournament/TournamentDescriptionModal';

const useEventWidgetModals = () => {
  useEffect(() => {
    NiceModal.register(ModalCodes.tournamentDescriptionModal, TournamentDescriptionModal);

    const unregisterModals = () => {
      unregister(ModalCodes.tournamentDescriptionModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const commonRatingTypes = {
  clan: 'clan',
  player: 'player',
  playerClan: 'player_clan',
};

const getTopItemClassName = item => (
  cn('text-dark font-weight-bold cb-custom-event-tr', {
    'cb-gold-place-bg': item?.place === 1,
    'cb-silver-place-bg': item?.place === 2,
    'cb-bronze-place-bg': item?.place === 3,
    'bg-white': !item?.place || item.place > 3,
    // 'bg-success': item.clanId && item.clanId === 1,
  })
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
    'cb-custom-event-common-leaderboard-bg text-dark font-weight-bold': isActive,
  },
);

const EventRatingPanel = ({
  topLeaderboard = [],
  commonLeaderboard: {
    items,
    // pageNumber,
    // pageSize,
    // totalEntries,
  } = {
    items: [],
    pageNumber: 1,
    pageSize: 10,
    totalEntries: 0,
  },
  currentUserClanId,
  currentUserId,
  eventId,
}) => {
  const dispatch = useDispatch();

  const [type, setType] = useState(commonRatingTypes.clan);

  const handleClick = useCallback(e => {
    const { currentTarget: { dataset } } = e;
    setType(dataset.tabName);
  }, [setType]);

  useEffect(() => {
    (async () => {
      try {
        await dispatch(actions.fetchCommonLeaderboard({
          type,
          eventId,
          clanId: currentUserClanId,
          userId: currentUserId,
        }));
      } catch (e) {
        throw new Error(e.message);
      }
    })();
    /* eslint-disable-next-line */
  }, [type]);

  return (
    <>
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
                <React.Fragment key={item.place}>
                  <tr className="cb-custom-event-empty-space-tr" />
                  <tr className={getTopItemClassName(item)}>
                    <td width="122" className={tableDataCellClassName}>
                      {item.place}
                    </td>
                    <td width="120" className={tableDataCellClassName}>
                      {item.score}
                    </td>
                    <td width="240" className={tableDataCellClassName}>
                      {item.playersCount}
                    </td>
                    <td width="240" className={tableDataCellClassName}>
                      {item.clanName}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="d-flex flex-column">
        <div className="d-flex w-100 justify-content-starts border-bottom border-dark pb-2">
          <span className="font-weight-bold">{i18next.t('Event rating')}</span>
        </div>
        <div className="d-flex flex-column w-100 mt-3 cb-custom-event-common-leaderboard-bg rounded-lg">
          <nav className="pb-2">
            <div
              id="nav-tab"
              className={navTabsClassName}
              role="tablist"
            >
              <button
                type="button"
                id="clan-tab"
                className={getTabLinkClassName(type === commonRatingTypes.clan)}
                role="tab"
                data-tab-name="clan"
                onClick={handleClick}
              >
                {i18next.t('Clans rating')}
              </button>
              <button
                type="button"
                id="player-tab"
                className={getTabLinkClassName(type === commonRatingTypes.player)}
                role="tab"
                data-tab-name="player"
                onClick={handleClick}
              >
                {i18next.t('Players rating')}
              </button>
              <button
                type="button"
                id="clan-player-tab"
                className={getTabLinkClassName(type === commonRatingTypes.playerClan)}
                role="tab"
                data-tab-name="player_clan"
                onClick={handleClick}
              >
                {i18next.t('Clan players rating')}
              </button>
            </div>
          </nav>
          <div className="px-3 cb-overflow-x-auto">
            <table className="table table-striped cb-custom-event-table mt-3">
              <thead className="text-muted">
                <tr>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Place')}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Score')}</th>
                  {type === commonRatingTypes.clan && (
                    <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Clan players count')}</th>
                  )}
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Clan')}</th>
                  {type !== commonRatingTypes.clan && (
                    <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Login')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <React.Fragment key={item.place}>
                    <tr className="cb-custom-event-empty-space-tr" />
                    <tr className={getTopItemClassName({ clanId: item.clanId })}>
                      <td width="110" className={tableDataCellClassName}>
                        {item.place}
                      </td>
                      <td width="120" className={tableDataCellClassName}>
                        {item.score}
                      </td>
                      {item.playersCount !== undefined && (
                        <td width="240" className={tableDataCellClassName}>
                          {item.playersCount}
                        </td>
                      )}
                      <td width="240" className={tableDataCellClassName}>
                        {item.clanName}
                      </td>
                      {item.userName && (
                        <td width="240" className={tableDataCellClassName}>
                          {item.userName}
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

const TournamentStatus = ({
  type = 'loading',
}) => {
  switch (type) {
    case 'finished': return (
      <span
        style={{ width: 80 }}
        className="badge cb-custom-event-badge-danger text-self-center"
      >
        {i18next.t('closed')}
      </span>
    );
    case 'active': return (
      <span
        style={{ width: 80 }}
        className="badge cb-custom-event-badge-success text-self-center"
      >
        {i18next.t('active')}
      </span>
    );
    case 'loading': return (
      <span
        style={{ width: 80 }}
        className="badge badge-secondary text-self-center"
      >
        {i18next.t('...')}
      </span>
    );
    case 'waiting_participants':
    default: return (
      <span
        style={{ width: 80 }}
        className="badge cb-custom-event-badge-warning text-self-center"
      >
        {i18next.t('soon')}
      </span>
    );
  }
};

const TournamentInfo = ({
  id,
  type,
  name = i18next.t('Stage %{name}', { name: 1 }),
  nameClassName = '',
  data = '##.##',
  time = '##:##',
  handleOpenInstruction = () => {},
}) => (
  <div className="d-flex flex-column flex-lg-row align-items-center py-2 cb-custom-event-tournaments-item">
    <div className="d-flex">
      <span className={`${nameClassName} mx-3 font-weight-bold text-nowrap`}>
        {name}
      </span>
      <span className="align-content-center">
        <TournamentStatus
          type={type}
        />
      </span>
      <span className="ml-3 align-content-center cursor-pointer">
        <FontAwesomeIcon
          icon="info-circle"
          className="text-primary"
          onClick={handleOpenInstruction}
        />
      </span>
      <a href={`/tournaments/${id}`} className="ml-1 align-content-center">
        <FontAwesomeIcon
          icon="link"
          className="text-muted"
        />
      </a>
    </div>
    <div className="d-flex">
      <span className="ml-4">{data}</span>
      <span className="mx-4">{time}</span>
    </div>
  </div>
);

const EventCalendarPanel = ({ tournaments }) => {
  const handleOpenInstruction = useCallback(() => {
    NiceModal.show(ModalCodes.tournamentDescriptionModal);
  }, []);

  return (
    <div className="d-flex flex-column w-100">
      <div className="d-flex justify-content-center justify-content-lg-start border-bottom pb-2 px-3">
        <span className="font-weight-bold">{i18next.t('Event stages')}</span>
      </div>
      <div className="d-flex flex-column w-100">
        <TournamentInfo
          id={tournaments[0]?.id}
          type={
            tournaments[0]?.state
              || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 1 })}
          data="18.05"
          time="18:00"
          handleOpenInstruction={handleOpenInstruction}
        />
        <TournamentInfo
          id={tournaments[1]?.id}
          type={
            tournaments[1]?.state
              || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 1 })}
          nameClassName="cb-text-transparent"
          data="25.05"
          time="18:00"
          handleOpenInstruction={handleOpenInstruction}
        />
        <TournamentInfo
          id={tournaments[2]?.id}
          type={
            tournaments[2]?.state
              || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 1 })}
          nameClassName="cb-text-transparent"
          data="01.06"
          time="18:00"
          handleOpenInstruction={handleOpenInstruction}
        />
        <TournamentInfo
          id={tournaments[3]?.id}
          type={
            tournaments[3]?.state
              || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 2 })}
          data="08.06"
          time="18:00"
          handleOpenInstruction={handleOpenInstruction}
        />
        <TournamentInfo
          id={tournaments[4]?.id}
          type={
            tournaments[4]?.state
              || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 3 })}
          data="26.06"
          time="18:00"
          handleOpenInstruction={handleOpenInstruction}
        />
      </div>
    </div>
  );
};

function EventWidget() {
  // const searchParams = useSearchParams();
  useEventWidgetModals();

  const {
    id,
    loading,
    tournaments,
    topLeaderboard,
    commonLeaderboard,
  } = useSelector(eventSelector);
  const currentUserId = useSelector(currentUserIdSelector);
  const currentUserClanId = useSelector(currentUserClanIdSelector);

  const contentClassName = cn(
    'd-flex flex-column-reverse flex-lg-row',
    'flex-md-column-reverse flex-sm-column-reverse h-100',
    {
      'cb-opacity-50': loading === loadingStatuses.LOADING,
    },
  );
  const loadingClassName = cn(
    'justify-content-center align-items-center',
    'position-absolute h-100 w-100',
    {
      'd-flex': loading === loadingStatuses.LOADING,
      hidden: loading !== loadingStatuses.LOADING,
    },
  );

  return (
    <div className="d-flex flex-column position-relative h-100 container-lg">
      <div className={contentClassName}>
        <div className="d-flex flex-column h-100 m-2 mr-4 p-1 py-3">
          <EventRatingPanel
            currentUserId={currentUserId}
            currentUserClanId={currentUserClanId}
            topLeaderboard={topLeaderboard}
            commonLeaderboard={commonLeaderboard}
            eventId={id}
          />
        </div>
        <div className="rounded-lg border-0 bg-white m-2 py-3 h-100">
          <EventCalendarPanel tournaments={tournaments} />
        </div>
      </div>
      <div className={loadingClassName}>
        <Loading large />
      </div>
    </div>
  );
}

export default memo(EventWidget);
