import { Alert, Group, RingProgress, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconPercentage, IconStar, IconSwords, IconTrophy } from '@tabler/icons-react';
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSharedProps } from '@/shared/useSharedProps';

import { useTournamentStore } from '../store';
import type { Tournament } from '../types';
import type { TournamentApi } from '../useTournament';

import { PanelMessage } from './common';
import { MatchCards } from './MatchCards';
import classes from './Panels.module.css';

/** A stat tile: tinted icon, label, value, and an optional visual underneath. */
function Tile({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className={classes.tile}>
      <span className={classes.tileIcon}>{icon}</span>
      <div className={classes.tileBody}>
        <Text fz={10} c="dimmed" tt="uppercase" fw={700} lts="0.05em" truncate title={label}>
          {label}
        </Text>
        {children}
      </div>
    </div>
  );
}

function Big({ children }: { children: ReactNode }) {
  return (
    <Text span ff="var(--cb-font-display)" fw={800} fz={20} c="bright" lh={1.15}>
      {children}
    </Text>
  );
}

/** The viewer's own tournament: place, score, record and every match (legacy PlayerStatsPanel + StatisticsCard). */
export function PlayerPanel({ tournament, api }: { tournament: Tournament; api: TournamentApi }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const player = useTournamentStore((state) => state.players[me.id]);
  const allMatches = useTournamentStore((state) => state.matches);
  const matches = useMemo(() => Object.values(allMatches).filter((match) => match.player_ids.includes(me.id)), [allMatches, me.id]);

  const stats = useMemo(() => {
    const finished = matches.filter((match) => match.player_results?.[me.id] && match.player_results[me.id].result !== 'undefined');
    const wins = finished.filter((match) => match.winner_id === me.id).length;
    const losses = finished.filter((match) => match.winner_id != null && match.winner_id !== me.id).length;
    const tests = finished.map((match) => match.player_results[me.id].result_percent ?? 0);
    const avg = tests.length ? tests.reduce((sum, value) => sum + value, 0) / tests.length : 0;
    return { wins, losses, other: finished.length - wins - losses, avg };
  }, [matches, me.id]);

  if (!player) return <PanelMessage>{t('Join the tournament to see your matches here.')}</PanelMessage>;

  return (
    <Stack gap="sm">
      {player.state === 'banned' && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
          {t('You were marked for a fair play violation and are excluded from the results.')}
        </Alert>
      )}
      <div className={classes.tiles}>
        <Tile icon={<IconTrophy size={16} />} label={t('Place')}>
          <Group gap={6} align="center" wrap="nowrap">
            {player.place ? (
              <span className={classes.placeChip} data-place={player.place <= 3 ? player.place : undefined}>
                #{player.place}
              </span>
            ) : (
              <Big>—</Big>
            )}
            {tournament.players_count > 0 && (
              <Text span size="xs" c="dimmed">
                {t('of %{count}', { count: tournament.players_count })}
              </Text>
            )}
          </Group>
        </Tile>

        <Tile icon={<IconStar size={16} />} label={t('Score')}>
          <Big>{player.score ?? 0}</Big>
        </Tile>

        <Tile icon={<IconPercentage size={16} />} label={t('Avg Result')}>
          <Group gap={8} align="center" wrap="nowrap">
            <RingProgress
              size={30}
              thickness={4}
              roundCaps
              sections={[{ value: Math.min(100, stats.avg), color: stats.avg >= 100 ? 'green' : 'slate' }]}
            />
            <Big>{Math.round(stats.avg)}%</Big>
          </Group>
        </Tile>

        <Tile icon={<IconSwords size={16} />} label={t('Wins / losses')}>
          <Stack gap={4}>
            <Group gap={8} wrap="nowrap" align="baseline">
              <Big>
                {stats.wins}–{stats.losses}
              </Big>
              {stats.other > 0 && (
                <Text span size="xs" c="dimmed" ff="monospace">
                  {t('+%{count} no winner', { count: stats.other })}
                </Text>
              )}
            </Group>
            {stats.wins + stats.losses + stats.other > 0 && (
              <div className={classes.recordBar} aria-hidden>
                <span data-kind="win" style={{ flexGrow: stats.wins }} />
                <span data-kind="loss" style={{ flexGrow: stats.losses }} />
                <span data-kind="other" style={{ flexGrow: stats.other }} />
              </div>
            )}
          </Stack>
        </Tile>
      </div>
      <MatchCards api={api} matches={matches} playerId={me.id} showScoreFormula={tournament.type === 'ladder'} />
    </Stack>
  );
}
