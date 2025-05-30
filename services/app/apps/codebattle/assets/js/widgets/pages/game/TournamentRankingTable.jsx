import React from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import {
  currentUserClanIdSelector,
  tournamentSelector,
  gameStatusSelector,
} from '@/selectors';

import GameStateCodes from '../../config/gameStateCodes';
import { TournamentRemainingTimer } from '../tournament/TournamentHeader';

const getCustomEventTrClassName = (item, selectedId) => cn(
  'text-dark font-weight-bold cb-custom-event-tr-border',
  {
    'cb-gold-place-bg': item?.place === 1,
    'cb-silver-place-bg': item?.place === 2,
    'cb-bronze-place-bg': item?.place === 3,
    'bg-white': !item?.place || item?.place > 3,
  },
  {
    'cb-custom-event-tr-brown-border': item?.clanId === selectedId,
  },
);

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

const TournamentRankingTable = () => {
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const gameStatus = useSelector(gameStatusSelector);
  const {
    breakDurationSeconds,
    breakState,
    currentRoundPosition,
    lastRoundEndedAt,
    lastRoundStartedAt,
    matchTimeoutSeconds,
    ranking,
    roundTaskIds,
    roundTimeoutSeconds,
  } = useSelector(tournamentSelector);

  return (
    <div
      className={cn(
        'd-flex flex-column flex-grow-1 postion-relative py-2 mh-100 rounded-left',
        'cb-game-chat-container cb-messages-container',
      )}
    >
      <div className="d-flex justify-content-between border-bottom border-dark pb-2 px-3">
        <span className="font-weight-bold">{i18next.t('Ranking')}</span>
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
            {ranking?.entries?.map(item => (
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
                  <td
                    style={{ borderTopLeftRadius: '0.5rem', borderBottomLeftRadius: '0.5rem' }}
                    className={tableDataCellClassName}
                  >
                    <div
                      title={item?.name}
                      className="cb-custom-event-name"
                      style={{
 textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '13ch',
}}
                    >
                      {item?.name.slice(0, 9) + (item?.name.length > 11 ? '...' : '')}
                    </div>
                  </td>
                  <td className={tableDataCellClassName}>
                    <div
                      title={item?.clan}
                      className="cb-custom-event-name"
                      style={{
 textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '15ch',
}}
                    >
                      {item?.clan?.slice(0, 9) + (item?.clan?.length > 11 ? '...' : '')}
                    </div>
                  </td>
                  <td className={tableDataCellClassName}>{item.score}</td>
                  <td
                    style={{ borderTopRightRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}
                    className={tableDataCellClassName}
                  >
                    {item.place}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-around align-items-center mt-1">
        {
        (currentRoundPosition + 1 !== (roundTaskIds?.length || 0)
         && gameStatus.state !== GameStateCodes.playing
          && breakState === 'off') && (
          <span className="font-weight-bold me-3">
            {i18next.t('Round ends in ')}
            <TournamentRemainingTimer
              key={lastRoundStartedAt}
              startsAt={lastRoundStartedAt}
              duration={roundTimeoutSeconds || matchTimeoutSeconds}
            />
          </span>
        )
}

        {(gameStatus.state !== GameStateCodes.playing && breakState === 'on') && (
          <span className="font-weight-bold me-3">
            {i18next.t('Next round will start in ')}
            <TournamentRemainingTimer
              key={lastRoundEndedAt}
              startsAt={lastRoundEndedAt}
              duration={breakDurationSeconds}
            />
          </span>
        )}
      </div>

      <div className="d-flex justify-content-around align-items-center mt-1">
        {roundTaskIds?.length > 0 && (
          <span className="font-weight-bold">
            {i18next.t('Task')}
            {': '}
            {currentRoundPosition + 1}
            /
            {roundTaskIds.length}
          </span>
        )}
      </div>
    </div>
  );
};

export default TournamentRankingTable;
