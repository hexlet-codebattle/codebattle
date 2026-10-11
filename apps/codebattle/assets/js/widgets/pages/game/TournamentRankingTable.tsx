import React from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { currentUserClanIdSelector, tournamentSelector } from '@/selectors';

import LanguageIcon from '../../components/LanguageIcon';

interface RankingEntry {
  id: number;
  place?: number;
  clanId?: number;
  name?: string;
  clan?: string;
  score?: number;
  lang?: string;
  userLang?: string;
  user_lang?: string;
}

const getCustomEventTrClassName = (item: RankingEntry, selectedId: number | null) =>
  cn(
    'font-weight-bold cb-custom-event-tr-border',
    {
      'cb-gold-place-bg': item?.place === 1,
      'cb-silver-place-bg': item?.place === 2,
      'cb-bronze-place-bg': item?.place === 3,
    },
    {
      'cb-custom-event-tr-brown-border': item?.clanId === selectedId,
    },
  );

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

// Top of the live ranking (plus the viewer's own row) for the game page side panel.
function TournamentRankingTable() {
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const { ranking } = useSelector(tournamentSelector) as unknown as {
    ranking?: { entries?: RankingEntry[] };
  };

  return (
    <div className="d-flex cb-overflow-x-auto">
      <table className="table table-striped cb-custom-event-table cb-game-ranking-table m-1 cb-text">
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '44%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '16%' }} />
        </colgroup>
        <thead className="cb-text">
          <tr>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Place')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Player')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Clan')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Score')}</th>
          </tr>
        </thead>
        <tbody>
          {ranking?.entries?.slice(0, 7)?.map((item) => (
            <React.Fragment key={item.id}>
              <tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
              <tr
                className={getCustomEventTrClassName(
                  item,
                  (currentUserClanId as number | null) ?? null,
                )}
              >
                <td
                  style={{
                    borderTopLeftRadius: '0.5rem',
                    borderBottomLeftRadius: '0.5rem',
                  }}
                  className={tableDataCellClassName}
                >
                  {item.place}
                </td>
                <td className={tableDataCellClassName}>
                  <div
                    title={item?.name}
                    className="cb-custom-event-name"
                    style={{
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      maxWidth: '16ch',
                    }}
                  >
                    {(item?.lang || item?.userLang || item?.user_lang) && (
                      <LanguageIcon
                        className="mr-1"
                        lang={item?.lang || item?.userLang || item?.user_lang}
                      />
                    )}
                    {(item?.name ?? '').slice(0, 12) +
                      ((item?.name?.length ?? 0) > 14 ? '...' : '')}
                  </div>
                </td>
                <td className={tableDataCellClassName}>
                  <div
                    title={item?.clan}
                    className="cb-custom-event-name"
                    style={{
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      maxWidth: '14ch',
                    }}
                  >
                    {(item?.clan ?? '').slice(0, 12) +
                      ((item?.clan?.length ?? 0) > 14 ? '...' : '')}
                  </div>
                </td>
                <td
                  style={{
                    borderTopRightRadius: '0.5rem',
                    borderBottomRightRadius: '0.5rem',
                  }}
                  className={tableDataCellClassName}
                >
                  {item.score}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TournamentRankingTable;
