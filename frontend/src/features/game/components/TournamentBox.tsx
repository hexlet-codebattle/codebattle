import { Anchor, Group, Text } from '@mantine/core';
import { IconTrophy } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';

import { RoundClock } from '@/features/tournament/components/RoundClock';
import type { Tournament } from '@/features/tournament/types';
import { LangIcon } from '@/shared/LangIcon';
import { useSharedProps } from '@/shared/useSharedProps';

import { useGameStore } from '../store';
import type { GameTournamentInfo } from '../types';
import classes from '../GameRoom.module.css';

import { Spectators } from './Spectators';

// The round clock is shared with the tournament page; it reads only the clock fields.
const asClockTournament = (info: GameTournamentInfo) =>
  ({ ...info, id: info.tournament_id, starts_at: null }) as unknown as Tournament;

/** Tournament games: where the round is, your place, the top of the standings and who watches. */
export function TournamentBox({ info }: { info: GameTournamentInfo }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const gameId = useGameStore((state) => state.game?.id);
  const playerIds = useGameStore(useShallow((state) => state.game?.players.map((player) => player.id) ?? []));
  const entries = [...(info.ranking?.entries ?? [])].sort((a, b) => a.place - b.place);
  const top = entries.filter((entry) => entry.place <= 5);
  const mine = entries.find((entry) => entry.id === me.id);
  const showMineApart = mine && mine.place > 5;
  const href = `/tournaments/${info.tournament_id}`;

  return (
    <div className={classes.tournamentBox}>
      {info.state === 'active' && (
        <RoundClock tournament={asClockTournament(info)} playerRoundPosition={info.game_round_position} compact embedded />
      )}

      <div className={classes.standings}>
        <Group justify="space-between" gap="xs" className={classes.standingsHead}>
          <Anchor href={href} size="xs" fw={700} c="dimmed" className={classes.standingsTitle}>
            <IconTrophy size={13} />
            {t('Ranking')}
          </Anchor>
          {(mine || currentPlayer) && (
            <Text size="xs" c="dimmed">
              {t('You')}:{' '}
              <Text span fw={800} c="bright" ff="monospace">
                #{mine?.place ?? currentPlayer?.place ?? '—'}
              </Text>
              {' · '}
              <Text span fw={700} ff="monospace">
                {mine?.score ?? currentPlayer?.score ?? 0}
              </Text>
            </Text>
          )}
        </Group>
        <ol className={classes.rankList}>
          {top.map((entry) => (
            <li key={entry.id} className={classes.rankRow} data-me={entry.id === me.id || undefined}>
              <span className={classes.rankPlace}>{entry.place}</span>
              <LangIcon lang={entry.lang} size={13} />
              <Text span size="xs" fw={entry.id === me.id ? 800 : 500} truncate className={classes.rankName}>
                {entry.name}
              </Text>
              <span className={classes.rankScore}>{entry.score}</span>
            </li>
          ))}
          {showMineApart && (
            <>
              <li className={classes.rankGap} aria-hidden>
                ⋯
              </li>
              <li className={classes.rankRow} data-me>
                <span className={classes.rankPlace}>{mine.place}</span>
                <LangIcon lang={mine.lang} size={13} />
                <Text span size="xs" fw={800} truncate className={classes.rankName}>
                  {mine.name}
                </Text>
                <span className={classes.rankScore}>{mine.score}</span>
              </li>
            </>
          )}
          {top.length === 0 && !mine && (
            <Text size="xs" c="dimmed" ta="center" py={6}>
              {t('No results yet')}
            </Text>
          )}
        </ol>
      </div>

      {gameId != null && (
        <div className={classes.tournamentWatchers}>
          <Text span size="xs" fw={700} c="dimmed" className={classes.standingsTitle}>
            {t('Watching')}
          </Text>
          <Spectators gameId={gameId} playerIds={playerIds} />
        </div>
      )}
    </div>
  );
}
