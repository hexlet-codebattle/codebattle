import { Alert, Button, Chip, Group, Modal, SegmentedControl, Select, Slider, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createInvite, inviteErrorText } from '@/features/invites/actions';
import type { InviteUser } from '@/features/invites/store';
import { t as translate } from '@/i18n';
import { useSharedProps } from '@/shared/useSharedProps';

import { LEVELS, levelLabel } from '../format';
import type { GameLevel, Task } from '../types';

import { OpponentPicker } from './OpponentPicker';

// Same list RootController passes to the lobby; other pages have no task_tags prop.
export const DEFAULT_TASK_TAGS = ['strings', 'math', 'hash-maps', 'collections', 'rest'];

type OpponentMode = 'other_user' | 'bot' | 'friend';

export interface CreateGameParams {
  level: GameLevel;
  opponent_type: 'other_user' | 'bot';
  timeout_seconds: number;
  task_id: number | null;
  task_tags: string[];
}

interface CreateGameModalProps {
  opened: boolean;
  onClose: () => void;
  /** Popular tags from the page props; tasks with other or no tags fall under "rest". */
  taskTags?: string[];
  /** Random-player and bot games (lobby channel). Without it only "With a friend" is offered. */
  onCreate?: (params: CreateGameParams) => Promise<void>;
  /** Preselects "With a friend" and this opponent (hover card, chat, ?opponent_id=). */
  initialOpponent?: InviteUser | null;
}

const DEFAULT_MINUTES = 8;
const REST_TAG = 'rest';

async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('/api/v1/tasks');
  if (!response.ok) throw new Error(`tasks: ${response.status}`);

  return (await response.json()).tasks;
}

function taskTagGroups(task: Task, popular: string[]) {
  const named = popular.filter((tag) => tag !== REST_TAG);
  const groups = task.tags.filter((tag) => named.includes(tag));

  return task.tags.length === 0 || task.tags.some((tag) => !named.includes(tag)) ? [...groups, REST_TAG] : groups;
}

function taskLabel(task: Task, locale: string) {
  const description = (locale === 'ru' ? task.description_ru : task.description_en) ?? task.description_en ?? '';
  const firstLine = description
    .split('\n')
    .map((line) => line.replaceAll('#', '').trim())
    .find(Boolean);

  return firstLine || task.name;
}

const errorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const { message, reason } = error as { message?: string; reason?: string };
    // The server sends `message` already translated (gettext); `reason` is a code.
    if (message) return message;
    if (reason) return reason.replaceAll('_', ' ');
  }

  return translate('Could not create the game. Try again.');
};

export function CreateGameModal({
  opened,
  onClose,
  taskTags = DEFAULT_TASK_TAGS,
  onCreate,
  initialOpponent = null,
}: CreateGameModalProps) {
  const { t } = useTranslation();
  const { locale } = useSharedProps();
  const inviteOnly = !onCreate;
  const [level, setLevel] = useState<GameLevel>('elementary');
  const [opponent, setOpponent] = useState<OpponentMode>(inviteOnly ? 'friend' : 'other_user');
  const [friend, setFriend] = useState<InviteUser | null>(initialOpponent);
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [tags, setTags] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: tasks = [], isPending } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks, enabled: opened });

  // Each opening starts from the requested opponent (or the default mode).
  useEffect(() => {
    if (!opened) return;
    setFriend(initialOpponent);
    setOpponent(initialOpponent || inviteOnly ? 'friend' : 'other_user');
    setError(null);
  }, [opened, initialOpponent, inviteOnly]);

  const levelTasks = useMemo(() => tasks.filter((task) => task.level === level), [tasks, level]);
  const matchingTasks = useMemo(
    () =>
      tags.length === 0
        ? levelTasks
        : levelTasks.filter((task) => taskTagGroups(task, taskTags).some((tag) => tags.includes(tag))),
    [levelTasks, tags, taskTags],
  );
  // Only offer tags that have tasks at this level.
  const availableTags = useMemo(
    () => taskTags.filter((tag) => levelTasks.some((task) => taskTagGroups(task, taskTags).includes(tag))),
    [levelTasks, taskTags],
  );
  const selectedTask = levelTasks.find((task) => String(task.id) === taskId);

  const changeLevel = (value: string) => {
    setLevel(value as GameLevel);
    setTaskId(null);
    setTags([]);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      if (opponent === 'friend') {
        if (!friend) return;
        await createInvite({
          recipient_id: friend.id,
          level,
          timeout_seconds: minutes * 60,
          task_id: selectedTask?.id ?? null,
        });
        notifications.show({
          color: 'green',
          message: translate('Invite sent to %{name}. Waiting for the reply…', { name: friend.name }),
        });
      } else {
        await onCreate?.({
          level,
          opponent_type: opponent,
          timeout_seconds: minutes * 60,
          task_id: selectedTask?.id ?? null,
          task_tags: selectedTask ? [] : tags,
        });
      }
      onClose();
    } catch (reason) {
      setError(opponent === 'friend' ? inviteErrorText(reason) : errorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={inviteOnly ? t('Invite to a battle') : t('Create a battle')} size="lg">
      <Stack gap="lg">
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            {t('Level')}
          </Text>
          <SegmentedControl
            fullWidth
            value={level}
            onChange={changeLevel}
            data={LEVELS.map((value) => ({ value, label: levelLabel(value) }))}
          />
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            {t('Opponent')}
          </Text>
          {!inviteOnly && (
            <SegmentedControl
              fullWidth
              value={opponent}
              onChange={(value) => setOpponent(value as OpponentMode)}
              data={[
                { value: 'other_user', label: t('Random player') },
                { value: 'friend', label: t('With a friend') },
                { value: 'bot', label: t('Bot') },
              ]}
            />
          )}
          {opponent === 'friend' && <OpponentPicker value={friend} onChange={setFriend} />}
        </Stack>

        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              {t('Time control')}
            </Text>
            <Text size="sm" ff="monospace" c="bright">
              {t('%{count} min', { count: minutes })}
            </Text>
          </Group>
          <Slider
            min={1}
            max={60}
            value={minutes}
            onChange={setMinutes}
            label={null}
            marks={[{ value: 1 }, { value: 15 }, { value: 30 }, { value: 45 }, { value: 60 }]}
          />
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            {t('Task')}
          </Text>
          <Chip.Group multiple value={selectedTask ? taskTagGroups(selectedTask, taskTags) : tags} onChange={setTags}>
            <Group gap={6}>
              {availableTags.map((tag) => (
                <Chip key={tag} value={tag} size="xs" disabled={Boolean(selectedTask)}>
                  {tag}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
          <Select
            searchable
            clearable
            disabled={isPending}
            placeholder={isPending ? t('Loading tasks…') : t('random task (%{total} available)', { total: matchingTasks.length })}
            value={taskId}
            onChange={setTaskId}
            data={matchingTasks.map((task) => ({ value: String(task.id), label: taskLabel(task, locale) }))}
            nothingFoundMessage={t('No tasks match')}
          />
        </Stack>

        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {error}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            variant="filled"
            color="green"
            onClick={submit}
            loading={submitting}
            disabled={opponent === 'friend' && !friend}
          >
            {opponent === 'friend' ? t('Send invite') : t('Create battle')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
