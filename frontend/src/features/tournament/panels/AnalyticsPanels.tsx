import { Anchor, Badge, Group, Paper, ScrollArea, Stack, Switch, Table, Text, Title, Tooltip, UnstyledButton } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { formatSeconds } from '@/features/tasks/shared';
import { LangIcon } from '@/shared/LangIcon';
import { useSharedProps } from '@/shared/useSharedProps';
import { Markdown } from '@/shared/Markdown';

import { useTournamentStore } from '../store';
import type { Tournament } from '../types';
import type { TournamentApi } from '../useTournament';

import { num, PanelMessage } from './common';
import classes from './Panels.module.css';
import { usePanelResults } from './usePanelResults';

const waitingText = (t: (key: string) => string) => t('Statistics appear once the tournament starts.');

function UserLink({ id, name, lang, onSelect }: { id: number; name: string; lang: string | null; onSelect?: (userId: number) => void }) {
  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      <LangIcon lang={lang} />
      {onSelect ? (
        <UnstyledButton onClick={() => onSelect(id)}>
          <Text span size="sm" fw={600} c="bright" truncate td="underline" style={{ textDecorationStyle: 'dotted' }}>
            {name}
          </Text>
        </UnstyledButton>
      ) : (
        <Anchor href={`/users/${id}`} size="sm" fw={600} c="bright" truncate>
          {name}
        </Anchor>
      )}
    </Group>
  );
}

// --- Top users by clan ranking -------------------------------------------------------------

interface ClanUserRow {
  clan_id: number;
  clan_name: string;
  clan_long_name: string | null;
  user_id: number;
  user_name: string;
  user_lang: string | null;
  total_score: number;
  total_duration_sec: number;
  wins_count: number;
  clan_rank: number;
}

/** Best players of the leading clans (get_results "top_users_by_clan_ranking"). */
export function ClanRankingPanel({ tournament, api, onSelectUser }: { tournament: Tournament; api: TournamentApi; onSelectUser?: (id: number) => void }) {
  const { t } = useTranslation();
  const { rows, failed, waiting } = usePanelResults<ClanUserRow>(api, tournament.state, { type: 'top_users_by_clan_ranking' });

  const clans = useMemo(() => {
    const map = new Map<number, ClanUserRow[]>();
    for (const row of rows ?? []) map.set(row.clan_rank, [...(map.get(row.clan_rank) ?? []), row]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  if (waiting) return <PanelMessage>{waitingText(t)}</PanelMessage>;
  if (failed) return <PanelMessage>{t("Couldn't load the results.")}</PanelMessage>;
  if (!rows) return <PanelMessage loading />;
  if (clans.length === 0) return <PanelMessage>{t('No results yet')}</PanelMessage>;

  return (
    <Table.ScrollContainer minWidth={520}>
      <Table verticalSpacing={4} fz="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('Clan / Player')}</Table.Th>
            <Table.Th ta="right">{t('Score')}</Table.Th>
            <Table.Th ta="right">{t('Wins')}</Table.Th>
            <Table.Th ta="right">{t('Time')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {clans.map(([rank, users], index) => {
            const first = users[0];
            const sum = (key: 'total_score' | 'wins_count' | 'total_duration_sec') => users.reduce((total, row) => total + (row[key] ?? 0), 0);
            return [
              <Table.Tr key={`clan-${rank}`} className={classes.groupRow} data-muted={index > 3 || undefined}>
                <Table.Td>
                  <Group gap={8}>
                    <Badge size="sm" variant="default" ff="monospace">
                      #{rank}
                    </Badge>
                    <Tooltip label={first.clan_long_name} disabled={!first.clan_long_name}>
                      <Text span fw={700} c="bright">
                        {first.clan_name}
                      </Text>
                    </Tooltip>
                  </Group>
                </Table.Td>
                <Table.Td ta="right" ff="monospace" fw={700}>
                  {sum('total_score')}
                </Table.Td>
                <Table.Td ta="right" ff="monospace" fw={700}>
                  {sum('wins_count')}
                </Table.Td>
                <Table.Td ta="right" ff="monospace" fw={700}>
                  {formatSeconds(sum('total_duration_sec'))}
                </Table.Td>
              </Table.Tr>,
              ...users.map((row) => (
                <Table.Tr key={`user-${rank}-${row.user_id}`} data-muted={index > 3 || undefined} className={classes.childRow}>
                  <Table.Td pl="xl">
                    <UserLink id={row.user_id} name={row.user_name} lang={row.user_lang} onSelect={onSelectUser} />
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {row.total_score}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {row.wins_count}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace" c="dimmed">
                    {formatSeconds(row.total_duration_sec)}
                  </Table.Td>
                </Table.Tr>
              )),
            ];
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

// --- Tasks ranking -------------------------------------------------------------------------

interface TaskRow {
  task_id: number;
  name: string;
  level: GameLevel;
  round_position: number;
  wins_count: number;
  min: string | number | null;
  p5: string | number | null;
  p25: string | number | null;
  p50: string | number | null;
  p75: string | number | null;
  p95: string | number | null;
  max: string | number | null;
}

const seconds = (value: string | number | null) => {
  const parsed = num(value);
  return parsed == null ? '—' : formatSeconds(Math.round(parsed));
};

/**
 * Solve times per task among winners (get_results "tasks_ranking"). Headers name the
 * percentile each column really holds (the SQL "p75" is PERCENTILE_CONT(0.85)); the
 * legacy table had them shifted by one.
 */
export function TasksRankingPanel({ tournament, api, onSelectTask }: { tournament: Tournament; api: TournamentApi; onSelectTask: (id: number) => void }) {
  const { t } = useTranslation();
  const { rows, failed, waiting } = usePanelResults<TaskRow>(api, tournament.state, { type: 'tasks_ranking' });

  if (waiting) return <PanelMessage>{waitingText(t)}</PanelMessage>;
  if (failed) return <PanelMessage>{t("Couldn't load the results.")}</PanelMessage>;
  if (!rows) return <PanelMessage loading />;
  if (rows.length === 0) return <PanelMessage>{t('No results yet')}</PanelMessage>;

  return (
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing={4} fz="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('Round')}</Table.Th>
            <Table.Th>{t('Task')}</Table.Th>
            <Table.Th ta="right">{t('Solutions')}</Table.Th>
            <Table.Th ta="right">{t('Fastest')}</Table.Th>
            {['5%', '25%', '50%', '85%', '95%'].map((label) => (
              <Table.Th key={label} ta="right" ff="monospace">
                {label}
              </Table.Th>
            ))}
            <Table.Th ta="right">{t('Slowest')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={`${row.round_position}-${row.task_id}`} onClick={() => onSelectTask(row.task_id)} style={{ cursor: 'pointer' }}>
              <Table.Td ff="monospace" c="dimmed">
                {row.round_position + 1}
              </Table.Td>
              <Table.Td maw={260}>
                <Group gap={6} wrap="nowrap">
                  <Badge size="xs" variant="light" color={LEVEL_COLORS[row.level] ?? 'gray'}>
                    {levelLabel(row.level)}
                  </Badge>
                  <Text size="sm" fw={600} c="bright" truncate>
                    {row.name}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td ta="right" ff="monospace" fw={700}>
                {row.wins_count}
              </Table.Td>
              <Table.Td ta="right" ff="monospace">
                {seconds(row.min)}
              </Table.Td>
              {(['p5', 'p25', 'p50', 'p75', 'p95'] as const).map((key) => (
                <Table.Td key={key} ta="right" ff="monospace" c="dimmed">
                  {seconds(row[key])}
                </Table.Td>
              ))}
              <Table.Td ta="right" ff="monospace">
                {seconds(row.max)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

// --- Clans bubble distribution -------------------------------------------------------------

interface ClanBubbleRow {
  clan_id: number;
  clan_name: string;
  clan_long_name: string | null;
  total_score: number;
  player_count: number;
  performance: number;
  radius: number;
}

const BUBBLE_COLORS = ['#FF621E', '#2AE881', '#FFE500', '#B6A4FF', '#73CCFE', '#FF9C41'];

/** Clans as bubbles: x = total score, y = score per player, size = players (get_results "clans_bubble_distribution"). */
export function ClansBubblePanel({ tournament, api }: { tournament: Tournament; api: TournamentApi }) {
  const { t } = useTranslation();
  const { rows, failed, waiting } = usePanelResults<ClanBubbleRow>(api, tournament.state, { type: 'clans_bubble_distribution' });

  if (waiting) return <PanelMessage>{waitingText(t)}</PanelMessage>;
  if (failed) return <PanelMessage>{t("Couldn't load the results.")}</PanelMessage>;
  if (!rows) return <PanelMessage loading />;

  const top = rows.slice(0, 6);
  if (top.length === 0) return <PanelMessage>{t('No results yet')}</PanelMessage>;

  const W = 640;
  const H = 320;
  const PAD = 48;
  const maxX = Math.max(...top.map((row) => row.total_score), 1) * 1.15;
  const maxY = Math.max(...top.map((row) => row.performance), 1) * 1.2;
  const x = (value: number) => PAD + (value / maxX) * (W - PAD * 1.5);
  const y = (value: number) => H - PAD - (value / maxY) * (H - PAD * 1.5);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <Stack gap="xs">
      <Group gap="md" justify="center">
        {top.map((row) => (
          <Group key={row.clan_id} gap={6} wrap="nowrap">
            <span className={classes.swatch} style={{ background: BUBBLE_COLORS[row.clan_id % 6] }} />
            <Tooltip label={row.clan_long_name} disabled={!row.clan_long_name}>
              <Text size="xs" fw={600}>
                {row.clan_name} [{row.player_count}]
              </Text>
            </Tooltip>
          </Group>
        ))}
      </Group>
      <svg viewBox={`0 0 ${W} ${H}`} className={classes.chart} role="img" aria-label={t('Clans bubble distribution')}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD} x2={W - PAD / 2} y1={y(maxY * tick)} y2={y(maxY * tick)} className={classes.grid} />
            <text x={PAD - 6} y={y(maxY * tick) + 4} textAnchor="end" className={classes.axisLabel}>
              {Math.round(maxY * tick)}
            </text>
            <text x={x(maxX * tick)} y={H - PAD + 16} textAnchor="middle" className={classes.axisLabel}>
              {Math.round(maxX * tick)}
            </text>
          </g>
        ))}
        <text x={W / 2} y={H - 6} textAnchor="middle" className={classes.axisTitle}>
          {t('Total score')}
        </text>
        <text x={12} y={H / 2} textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`} className={classes.axisTitle}>
          {t('Score per player')}
        </text>
        {top.map((row) => (
          <circle
            key={row.clan_id}
            cx={x(row.total_score)}
            cy={y(row.performance)}
            r={row.radius + 15}
            fill={BUBBLE_COLORS[row.clan_id % 6]}
            fillOpacity={0.55}
            stroke={BUBBLE_COLORS[row.clan_id % 6]}
          >
            <title>{`${row.clan_name}: ${row.total_score} · ${row.performance}/${t('player')} · ${row.player_count}`}</title>
          </circle>
        ))}
      </svg>
    </Stack>
  );
}

// --- Task drill-down -----------------------------------------------------------------------

interface TaskInfo {
  id: number;
  level: GameLevel;
  name: string;
  description_en: string | null;
  description_ru: string | null;
  time_to_solve_sec: number | null;
  base_score: number | null;
}

interface TopTaskUser {
  user_id: number;
  user_name: string;
  user_lang: string | null;
  clan_id: number | null;
  clan_name: string | null;
  clan_long_name: string | null;
  score: number;
  duration_sec: number;
  game_id: number;
}

interface DurationBucket {
  start: number;
  end: number;
  wins_count: number;
}

/**
 * Winners' solve times on a fixed 0 … time-to-solve scale (the server's buckets), with
 * quarter ticks and the viewer's own solve marked.
 */
function DurationChart({ buckets, myDuration }: { buckets: DurationBucket[]; myDuration: number | null }) {
  const { t } = useTranslation();
  const scale = buckets[buckets.length - 1].end || 1;
  const maxWins = Math.max(1, ...buckets.map((bucket) => bucket.wins_count));
  const mine = myDuration != null ? Math.min(100, (myDuration / scale) * 100) : null;
  const inBucket = (bucket: DurationBucket, index: number) =>
    myDuration != null && myDuration >= bucket.start && (myDuration < bucket.end || index === buckets.length - 1);

  return (
    <div className={classes.durationChart}>
      <div className={classes.histogram}>
        {buckets.map((bucket, index) => (
          <Tooltip
            key={bucket.start}
            label={t('%{from}–%{to}: %{count} solved', {
              from: formatSeconds(bucket.start),
              to: formatSeconds(bucket.end),
              count: bucket.wins_count,
            })}
          >
            <div className={classes.histogramCol}>
              <div
                className={classes.histogramBar}
                data-mine={inBucket(bucket, index) || undefined}
                style={{ height: bucket.wins_count ? `${(bucket.wins_count / maxWins) * 100}%` : undefined }}
              />
            </div>
          </Tooltip>
        ))}
        {mine != null && (
          <div className={classes.myMarker} style={{ left: `${mine}%` }}>
            <span className={classes.myLabel}>{t('You %{time}', { time: formatSeconds(myDuration!) })}</span>
          </div>
        )}
      </div>
      <div className={classes.axis}>
        {[0, 0.25, 0.5, 0.75, 1].map((share) => (
          <span key={share} style={{ left: `${share * 100}%` }} data-edge={share === 0 ? 'start' : share === 1 ? 'end' : undefined}>
            {formatSeconds(Math.round(scale * share))}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One task: how fast winners solved it and who was fastest (legacy TaskRankingAdvancedPanel). */
export function TaskAdvancedPanel({
  tournament,
  api,
  taskId,
  onBack,
  onSelectUser,
}: {
  tournament: Tournament;
  api: TournamentApi;
  taskId: number;
  onBack: () => void;
  onSelectUser?: (id: number) => void;
}) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const matches = useTournamentStore((state) => state.matches);
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const top = usePanelResults<TopTaskUser>(api, tournament.state, { type: 'top_user_by_task_ranking', task_id: taskId });
  const distribution = usePanelResults<DurationBucket>(api, tournament.state, { type: 'task_duration_distribution', task_id: taskId });

  useEffect(() => {
    if (api.status !== 'joined') return;
    api
      .push<TaskInfo>('tournament:get_task', { task_id: taskId })
      .then(setTask)
      .catch(() => undefined);
  }, [api, taskId]);

  const buckets = distribution.rows ?? [];
  // The viewer's own winning solve on this task, if any (top list, else their matches).
  const myDuration =
    top.rows?.find((row) => row.user_id === me.id)?.duration_sec ??
    Object.values(matches).find(
      (match) =>
        match.task_id === taskId &&
        match.duration_sec != null &&
        (match.player_results?.[me.id]?.result_percent ?? 0) >= 100,
    )?.duration_sec ??
    null;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <UnstyledButton onClick={onBack} aria-label={t('Back')}>
            <IconArrowLeft size={16} />
          </UnstyledButton>
          <Title order={5}>{task?.name ?? t('Task #%{id}', { id: taskId })}</Title>
          {task && (
            <Badge size="xs" variant="light" color={LEVEL_COLORS[task.level] ?? 'gray'}>
              {levelLabel(task.level)}
            </Badge>
          )}
          {task?.base_score != null && (
            <Badge size="xs" variant="default" tt="none">
              {t('Base score %{score}', { score: task.base_score })}
            </Badge>
          )}
          {task?.time_to_solve_sec != null && (
            <Badge size="xs" variant="default" tt="none">
              {t('Time limit %{time}', { time: formatSeconds(task.time_to_solve_sec) })}
            </Badge>
          )}
        </Group>
        <Switch size="xs" label={t('Show task description')} checked={showDescription} onChange={(event) => setShowDescription(event.currentTarget.checked)} />
      </Group>

      <Paper withBorder p="sm" radius="md">
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em" mb="xs">
          {t('Task duration distribution')}
        </Text>
        {distribution.rows == null ? (
          <PanelMessage loading={!distribution.waiting}>{distribution.waiting ? waitingText(t) : null}</PanelMessage>
        ) : buckets.length === 0 ? (
          <PanelMessage>{t('No results yet')}</PanelMessage>
        ) : (
          <DurationChart buckets={buckets} myDuration={myDuration} />
        )}
      </Paper>

      {showDescription ? (
        <Paper withBorder p="sm" radius="md">
          <ScrollArea.Autosize mah={400}>
            <Stack gap="md">
              {task?.description_en && <Markdown>{task.description_en}</Markdown>}
              {task?.description_ru && <Markdown>{task.description_ru}</Markdown>}
            </Stack>
          </ScrollArea.Autosize>
        </Paper>
      ) : top.rows == null ? (
        <PanelMessage loading={!top.waiting}>{top.waiting ? waitingText(t) : null}</PanelMessage>
      ) : top.rows.length === 0 ? (
        <PanelMessage>{t('No results yet')}</PanelMessage>
      ) : (
        <Table.ScrollContainer minWidth={520}>
          <Table verticalSpacing={4} fz="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('Player')}</Table.Th>
                <Table.Th>{t('Clan')}</Table.Th>
                <Table.Th ta="right">{t('Score')}</Table.Th>
                <Table.Th ta="right">{t('Duration')}</Table.Th>
                <Table.Th ta="right">{t('Game')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {top.rows.map((row) => (
                <Table.Tr key={`${row.user_id}-${row.game_id}`}>
                  <Table.Td>
                    <UserLink id={row.user_id} name={row.user_name} lang={row.user_lang} onSelect={onSelectUser} />
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={row.clan_long_name} disabled={!row.clan_long_name}>
                      <Text size="sm" c="dimmed" truncate>
                        {row.clan_name ?? '—'}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace" fw={700}>
                    {row.score}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {formatSeconds(row.duration_sec)}
                  </Table.Td>
                  <Table.Td ta="right">
                    <Anchor href={`/games/${row.game_id}`} size="sm" ff="monospace">
                      #{row.game_id}
                    </Anchor>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
