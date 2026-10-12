import { Badge, Group, Table, type TableThProps, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { UserCard } from '@/features/users/UserCard';

/** TaskController's lean task JSON (CodebattleWeb.NewFrontend.Present.task/1). */
export interface TaskRow {
  id: number;
  name: string;
  level: GameLevel;
  time_to_solve_sec: number | null;
  base_score: number | null;
  tags: string[];
  origin: string;
  state: string;
  visibility: string;
  creator_id: number | null;
  creator: { id: number; name: string } | null;
  inserted_at: string;
  updated_at: string;
}

export interface TaskPack {
  id: number;
  name: string;
  state: string;
  visibility: string;
  task_ids: number[];
  creator_id: number | null;
  creator: { id: number; name: string } | null;
  inserted_at: string;
  updated_at: string;
}

const STATE_COLORS: Record<string, string> = {
  active: 'green',
  disabled: 'red',
  draft: 'gray',
  moderation: 'yellow',
  blank: 'gray',
};

export function StateBadge({ state }: { state: string }) {
  const { t } = useTranslation();
  return (
    <Badge size="xs" variant="light" color={STATE_COLORS[state] ?? 'gray'}>
      {t(state)}
    </Badge>
  );
}

export function LevelBadge({ level }: { level: GameLevel }) {
  return (
    <Badge size="sm" variant="light" color={LEVEL_COLORS[level]}>
      {levelLabel(level)}
    </Badge>
  );
}

/** One line of tag chips: the first `max`, then "+N" with the full list on hover. */
export function Tags({ tags, max = 2 }: { tags: string[]; max?: number }) {
  if (tags.length === 0) return <Text size="sm" c="dimmed">—</Text>;

  const shown = tags.slice(0, max);
  const rest = tags.length - shown.length;

  return (
    <Group gap={4} wrap="nowrap">
      {shown.map((tag) => (
        <Badge key={tag} size="xs" variant="default" tt="none" style={{ flexShrink: 0 }}>
          {tag}
        </Badge>
      ))}
      {rest > 0 && (
        <Tooltip label={tags.join(', ')} openDelay={200}>
          <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
            +{rest}
          </Badge>
        </Tooltip>
      )}
    </Group>
  );
}

/** Header with the task field's real name (`time_to_solve_sec`…), as in the legacy tables. */
export function FieldTh({ children, ...props }: { children: string } & Omit<TableThProps, 'children'>) {
  return (
    <Table.Th tt="none" ff="monospace" fz="xs" fw={600} lts={0} {...props}>
      {children}
    </Table.Th>
  );
}

/** Raw seconds (what the field holds) with a m:ss hint. */
export function SecondsCell({ value }: { value: number | null }) {
  if (value == null) return <>—</>;

  return (
    <>
      <Text span ff="monospace" fw={600}>
        {value}
      </Text>
      <Text span size="xs" c="dimmed" ff="monospace">
        {' '}
        · {formatSeconds(value)}
      </Text>
    </>
  );
}

/** Creator name with the hover card, or a dash (system/GitHub tasks have none). */
export function CreatorCell({ creator }: { creator: { id: number; name: string } | null }) {
  if (!creator) return <Text size="sm" c="dimmed">—</Text>;

  return (
    <UserCard user={creator}>
      <Text span size="sm">
        {creator.name}
      </Text>
    </UserCard>
  );
}

/** 180 → "3:00", 3725 → "1:02:05". */
export function formatSeconds(total: number | null) {
  if (total == null) return '—';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
