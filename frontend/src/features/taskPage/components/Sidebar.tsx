import { Button, Card, Group, Select, Stack, TagsInput, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlayerPause, IconPlayerPlay, IconSwords, IconTrash } from '@tabler/icons-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LEVELS, levelLabel } from '@/features/lobby/format';
import { CreatorCell } from '@/features/tasks/shared';
import { MethodButton } from '@/shared/MethodButton';
import { Timestamp } from '@/shared/sortable';
import { useSharedProps } from '@/shared/useSharedProps';

import { createGameByTask, formatDuration, type Task, type TaskMeta } from '../api';

import classes from './TaskPage.module.css';

const STATES = ['blank', 'draft', 'on_moderation', 'active', 'disabled'];
const VISIBILITIES = ['public', 'hidden'];

export function PlayCard({ task }: { task: Task }) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const playable = task.state === 'active';

  const play = async () => {
    setCreating(true);
    try {
      const gameId = await createGameByTask(task.id);
      window.open(`/games/${gameId}`, '_blank');
    } catch {
      notifications.show({ color: 'red', message: t('Could not create the game. Try again.') });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <Stack gap="xs">
        <Button
          variant="filled"
          color="green"
          size="md"
          fullWidth
          leftSection={<IconSwords size={18} />}
          loading={creating}
          disabled={!playable}
          onClick={play}
        >
          {t('Play this task')}
        </Button>
        <Text size="xs" c="dimmed" ta="center">
          {playable ? t('Opens a game against a bot in a new tab.') : t('Task must be active to play')}
        </Text>
      </Stack>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={classes.detailRow}>
      <Text size="xs" c="dimmed" ff="monospace">
        {label}
      </Text>
      <div className={classes.detailValue}>{children}</div>
    </div>
  );
}

interface DetailsCardProps {
  task: Task;
  meta: TaskMeta | undefined;
  canEdit: boolean;
  /** Saves one field; rejects on failure (the caller shows the error). */
  onSave: (fields: Partial<Task>) => Promise<void>;
}

/** Task fields; editors (creator/admin) change level, state, visibility and tags inline. */
export function DetailsCard({ task, meta, canEdit, onSave }: DetailsCardProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const save = async (fields: Partial<Task>) => {
    setSaving(true);
    try {
      await onSave(fields);
    } finally {
      setSaving(false);
    }
  };

  const select = (field: 'level' | 'state' | 'visibility', options: string[], label: (value: string) => string) =>
    canEdit ? (
      <Select
        size="xs"
        allowDeselect={false}
        disabled={saving}
        value={task[field]}
        onChange={(value) => value && value !== task[field] && save({ [field]: value })}
        data={options.map((value) => ({ value, label: label(value) }))}
      />
    ) : (
      <Text size="sm">{label(task[field])}</Text>
    );

  return (
    <Card>
      <Title order={5} mb="sm">
        {t('Details')}
      </Title>
      <Stack gap={8}>
        <Row label="id">
          <Text size="sm" ff="monospace">
            {task.id}
          </Text>
        </Row>
        <Row label="level">{select('level', LEVELS, (value) => levelLabel(value as Task['level']))}</Row>
        <Row label="state">{select('state', STATES, (value) => t(value))}</Row>
        <Row label="visibility">{select('visibility', VISIBILITIES, (value) => t(value))}</Row>
        <Row label="type">
          <Text size="sm">{t(task.type || 'algorithms')}</Text>
        </Row>
        <Row label="origin">
          <Text size="sm">{task.origin ?? '—'}</Text>
        </Row>
        <Row label="time_to_solve_sec">
          <Text size="sm" ff="monospace">
            {task.time_to_solve_sec ?? '—'}
            {task.time_to_solve_sec != null && (
              <Text span size="xs" c="dimmed">
                {' '}
                · {formatDuration(task.time_to_solve_sec)}
              </Text>
            )}
          </Text>
        </Row>
        <Row label="base_score">
          <Text size="sm" ff="monospace">
            {task.base_score ?? '—'}
          </Text>
        </Row>
        <Row label="creator">
          <CreatorCell creator={meta?.creator ?? null} />
        </Row>
        <Row label="inserted_at">
          <Timestamp value={meta?.inserted_at} />
        </Row>
        <Row label="updated_at">
          <Timestamp value={meta?.updated_at} />
        </Row>
        <Row label="tags">
          {canEdit ? (
            <TagsInput
              size="xs"
              disabled={saving}
              value={task.tags}
              onChange={(tags) => save({ tags: [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))] })}
              placeholder={t('Add tag...')}
              splitChars={[',', ' ']}
              clearable
              aria-label={t('Add tag')}
            />
          ) : task.tags.length ? (
            <Text size="sm">{task.tags.join(', ')}</Text>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          )}
        </Row>
      </Stack>
    </Card>
  );
}

/** Admin moderation shortcuts (existing HTML routes). */
export function AdminCard({ task, canDelete }: { task: Task; canDelete: boolean }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();

  if (!me.is_admin && !canDelete) return null;

  return (
    <Card>
      <Group gap="xs" justify="center">
        {me.is_admin &&
          (task.state === 'active' ? (
            <MethodButton action={`/tasks/${task.id}/disable`} method="patch" size="compact-sm" leftSection={<IconPlayerPause size={14} />}>
              {t('Disable')}
            </MethodButton>
          ) : (
            <MethodButton
              action={`/tasks/${task.id}/activate`}
              method="patch"
              size="compact-sm"
              variant="light"
              color="green"
              leftSection={<IconPlayerPlay size={14} />}
            >
              {t('Activate')}
            </MethodButton>
          ))}
        {canDelete && (
          <MethodButton
            action={`/tasks/${task.id}`}
            method="delete"
            size="compact-sm"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={14} />}
            confirm={t('Delete task "%{name}"?', { name: task.name })}
          >
            {t('Delete')}
          </MethodButton>
        )}
      </Group>
    </Card>
  );
}
