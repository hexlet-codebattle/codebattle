import { Anchor, Badge, Button, Collapse, Group, Select, Stack, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconExternalLink } from '@tabler/icons-react';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { UserCard } from '@/features/users/UserCard';
import { getLocale } from '@/i18n';
import { LangIcon } from '@/shared/LangIcon';

import { useTournamentStore } from '../store';
import type { Player, Report } from '../types';
import type { TournamentApi } from '../useTournament';

import { PanelMessage } from './common';

const REPORT_STATES = ['pending', 'processed', 'confirmed', 'denied'];

const dateTime = (value: string) =>
  new Intl.DateTimeFormat(getLocale(), { dateStyle: 'short', timeStyle: 'medium', hour12: false }).format(
    new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`),
  );

function PlayerName({ id, players }: { id: number; players: Record<number, Player> }) {
  const player = players[id];
  const name = player?.name ?? `#${id}`;
  return (
    <Group gap={6} wrap="nowrap">
      <LangIcon lang={player?.lang} />
      <UserCard user={{ id, name }}>
        <Text span size="sm" fw={600} c={player?.state === 'banned' ? 'red' : 'bright'}>
          {name}
        </Text>
      </UserCard>
    </Group>
  );
}

/** Admins: game reports with their review state (legacy ReportsPanel). */
export function ReportsPanel({ api }: { api: TournamentApi }) {
  const { t } = useTranslation();
  const reports = useTournamentStore((state) => state.reports);
  const players = useTournamentStore((state) => state.players);

  // Open reports first, then offenders with the most open reports, newest first.
  const sorted = useMemo(() => {
    const open = new Map<number, number>();
    for (const report of reports) if (report.state !== 'denied') open.set(report.offender_id, (open.get(report.offender_id) ?? 0) + 1);
    return [...reports].sort(
      (a, b) =>
        Number(a.state === 'denied') - Number(b.state === 'denied') ||
        (open.get(b.offender_id) ?? 0) - (open.get(a.offender_id) ?? 0) ||
        a.offender_id - b.offender_id ||
        b.inserted_at.localeCompare(a.inserted_at),
    );
  }, [reports]);

  const update = async (report: Report, state: string) => {
    try {
      const { report: saved } = await api.adminPush<{ report: Report }>('tournament:report:update', { report_id: report.id, state });
      useTournamentStore.getState().upsertReport(saved);
    } catch {
      notifications.show({ color: 'red', message: t('Something went wrong') });
    }
  };

  if (sorted.length === 0) return <PanelMessage>{t('No reports')}</PanelMessage>;

  return (
    <Table.ScrollContainer minWidth={640}>
      <Table verticalSpacing={5} fz="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('Offender')}</Table.Th>
            <Table.Th>{t('Reporter')}</Table.Th>
            <Table.Th>{t('Reason')}</Table.Th>
            <Table.Th>{t('State')}</Table.Th>
            <Table.Th>{t('Inserted At')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sorted.map((report) => (
            <Table.Tr key={report.id} style={report.state === 'denied' ? { opacity: 0.55 } : undefined}>
              <Table.Td>
                <PlayerName id={report.offender_id} players={players} />
              </Table.Td>
              <Table.Td>
                <PlayerName id={report.reporter_id} players={players} />
              </Table.Td>
              <Table.Td c="dimmed">{t(report.reason)}</Table.Td>
              <Table.Td w={150}>
                <Select
                  size="xs"
                  data={REPORT_STATES.map((value) => ({ value, label: t(value) }))}
                  value={report.state}
                  onChange={(value) => value && value !== report.state && update(report, value)}
                  allowDeselect={false}
                />
              </Table.Td>
              <Table.Td c="dimmed" ff="monospace" fz="xs">
                {dateTime(report.inserted_at)}
              </Table.Td>
              <Table.Td>
                <Anchor href={`/games/${report.game_id}?realtime=true`} size="xs" target="_blank">
                  <Group gap={3} wrap="nowrap">
                    #{report.game_id}
                    <IconExternalLink size={12} />
                  </Group>
                </Anchor>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Admins: players marked as cheaters, with their reports; unban toggles (legacy CheatersPanel). */
export function CheatersPanel({ api }: { api: TournamentApi }) {
  const { t } = useTranslation();
  const players = useTournamentStore((state) => state.players);
  const reports = useTournamentStore((state) => state.reports);
  const [expanded, setExpanded] = useState<number | null>(null);

  const cheaters = useMemo(
    () => Object.values(players).filter((player) => player.state === 'banned').sort((a, b) => a.name.localeCompare(b.name)),
    [players],
  );
  const byOffender = useMemo(() => {
    const map = new Map<number, Report[]>();
    for (const report of [...reports].sort((a, b) => b.inserted_at.localeCompare(a.inserted_at))) {
      map.set(report.offender_id, [...(map.get(report.offender_id) ?? []), report]);
    }
    return map;
  }, [reports]);

  const toggle = async (player: Player) => {
    try {
      const { state } = await api.adminPush<{ state: Player['state'] }>('tournament:cheater:toggle', { user_id: player.id });
      useTournamentStore.getState().upsertPlayers([{ ...player, state }]);
    } catch {
      notifications.show({ color: 'red', message: t('Something went wrong') });
    }
  };

  if (cheaters.length === 0) return <PanelMessage>{t('No cheaters marked yet')}</PanelMessage>;

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {t('Total: %{count}', { count: cheaters.length })}
      </Text>
      <Table.ScrollContainer minWidth={560}>
        <Table verticalSpacing={5} fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('Player')}</Table.Th>
              <Table.Th>{t('Clan')}</Table.Th>
              <Table.Th ta="right">{t('Games')}</Table.Th>
              <Table.Th ta="right">{t('Reports')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {cheaters.map((player) => {
              const playerReports = byOffender.get(player.id) ?? [];
              return (
                <Fragment key={player.id}>
                  <Table.Tr>
                    <Table.Td>
                      <PlayerName id={player.id} players={players} />
                    </Table.Td>
                    <Table.Td c="dimmed">{player.clan ?? '—'}</Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      {player.matches_ids?.length ?? 0}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        disabled={playerReports.length === 0}
                        onClick={() => setExpanded((current) => (current === player.id ? null : player.id))}
                      >
                        {playerReports.length}
                      </Button>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Button size="compact-xs" variant="default" onClick={() => toggle(player)}>
                        {t('Unban')}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                  {playerReports.length > 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={5} p={0} style={{ borderTop: 0 }}>
                        <Collapse expanded={expanded === player.id}>
                          <Stack gap={4} px="md" py="xs">
                            {playerReports.map((report) => (
                              <Group key={report.id} gap="sm" fz="xs">
                                <PlayerName id={report.reporter_id} players={players} />
                                <Text size="xs" c="dimmed" ff="monospace">
                                  {dateTime(report.inserted_at)}
                                </Text>
                                <Badge size="xs" variant="light" color="gray">
                                  {t(report.state)}
                                </Badge>
                                <Anchor href={`/games/${report.game_id}`} size="xs">
                                  {t('Game #%{id}', { id: report.game_id })}
                                </Anchor>
                              </Group>
                            ))}
                          </Stack>
                        </Collapse>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Fragment>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
