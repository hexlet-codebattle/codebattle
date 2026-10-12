import { Head, useForm } from '@inertiajs/react';
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconArrowDown, IconArrowLeft, IconArrowUp, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Task } from '@/features/lobby/types';
import { LevelBadge, type TaskPack } from '@/features/tasks/shared';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from TaskPackController new/edit (task_pack is null when creating).
interface TaskPackFormProps {
  task_pack: TaskPack | null;
  visibility_types: string[];
  errors?: Record<string, string>;
}

const NAME_MAX = 37;

async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('/api/v1/tasks');
  if (!response.ok) throw new Error(`tasks: ${response.status}`);
  return (await response.json()).tasks;
}

/** "1, 37,42" → [1, 37, 42]; null when something isn't a positive integer. */
function parseIds(raw: string): number[] | null {
  const tokens = raw.split(',').map((token) => token.trim()).filter(Boolean);
  if (!tokens.every((token) => /^\d+$/.test(token))) return null;
  return tokens.map(Number);
}

export default function TaskPackForm() {
  const { t } = useTranslation();
  const { task_pack: pack, visibility_types: visibilityTypes, errors = {} } = useSharedProps<TaskPackFormProps>();
  const editing = pack != null;

  const form = useForm({
    name: pack?.name ?? '',
    visibility: pack?.visibility ?? 'public',
    task_ids: pack?.task_ids ?? ([] as number[]),
  });

  const { data: tasks = [], isPending } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const [mode, setMode] = useState<'list' | 'ids'>('list');
  const [rawIds, setRawIds] = useState('');
  const [search, setSearch] = useState<string | null>(null);

  const ids = form.data.task_ids;
  const setIds = (next: number[]) => form.setData('task_ids', next);
  const move = (from: number, to: number) => {
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setIds(next);
  };

  const rawIdsInvalid = mode === 'ids' && parseIds(rawIds) == null;

  const switchMode = (next: string) => {
    if (next === 'ids') setRawIds(ids.join(', '));
    if (next === 'list') {
      const parsed = parseIds(rawIds);
      if (parsed == null) return; // keep the user in the ids box until it parses
      setIds(parsed);
    }
    setMode(next as 'list' | 'ids');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const finalIds = mode === 'ids' ? parseIds(rawIds) ?? ids : ids;

    // The server parses task_ids from the legacy "1,37,42" string.
    form.transform((data) => ({
      task_pack: { name: data.name, visibility: data.visibility, task_ids: finalIds.join(',') },
    }));

    if (editing) form.patch(`/task_packs/${pack.id}`);
    else form.post('/task_packs');
  };

  const addOptions = tasks
    .filter((task) => !ids.includes(task.id))
    .map((task) => ({ value: String(task.id), label: `#${task.id} · ${task.name}${task.tags.length ? ` · ${task.tags.join(', ')}` : ''}` }));

  return (
    <AppLayout>
      <Head title={editing ? pack.name : t('Create new task pack')} />
      <PageHeader
        title={editing ? t('Edit task pack') : t('Create new task pack')}
        subtitle={editing ? pack.name : t('Ordered sets of tasks for tournaments.')}
        actions={
          <Button
            component="a"
            href={editing ? `/task_packs/${pack.id}` : '/task_packs'}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={14} />}
          >
            {editing ? t('Back to pack') : t('Task Packs')}
          </Button>
        }
      />

      <Card maw={860} mx="auto" padding="lg" component="form" onSubmit={submit}>
        <Stack gap="lg">
          {errors.base && (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {errors.base}
            </Alert>
          )}

          <Group grow align="flex-start">
            <TextInput
              label="name"
              description={t('Unique name, up to %{count} characters', { count: NAME_MAX })}
              maxLength={NAME_MAX}
              value={form.data.name}
              onChange={(event) => form.setData('name', event.currentTarget.value)}
              error={errors.name}
              required
              styles={{ label: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
            />
            <Select
              label="visibility"
              description={t('Hidden packs are visible only to you and admins')}
              allowDeselect={false}
              value={form.data.visibility}
              onChange={(value) => value && form.setData('visibility', value)}
              data={visibilityTypes}
              error={errors.visibility}
              styles={{ label: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
            />
          </Group>

          <Stack gap="xs">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="sm" fw={500} ff="monospace">
                  task_ids
                </Text>
                <Text size="xs" c="dimmed">
                  {t('Order matters: tournaments play the tasks in this order.')}
                </Text>
              </Stack>
              <SegmentedControl
                size="xs"
                value={mode}
                onChange={switchMode}
                data={[
                  { value: 'list', label: t('List') },
                  { value: 'ids', label: t('IDs') },
                ]}
              />
            </Group>

            {mode === 'ids' ? (
              <Textarea
                autosize
                minRows={3}
                value={rawIds}
                onChange={(event) => setRawIds(event.currentTarget.value)}
                placeholder="1, 37, 42"
                error={rawIdsInvalid ? t('Only integers separated by commas') : errors.task_ids}
                styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
              />
            ) : (
              <>
                <Select
                  searchable
                  clearable
                  disabled={isPending}
                  placeholder={isPending ? t('Loading tasks…') : t('Add a task: search by name, tag or id')}
                  value={search}
                  onChange={(value) => {
                    if (value) setIds([...ids, Number(value)]);
                    setSearch(null);
                  }}
                  data={addOptions}
                  limit={50}
                  nothingFoundMessage={t('No tasks match')}
                  error={errors.task_ids}
                />
                <Card padding={0} withBorder>
                  {ids.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="lg">
                      {t('No tasks yet. Add some above.')}
                    </Text>
                  ) : (
                    <ScrollArea.Autosize mah={440} type="auto">
                      <Table verticalSpacing={4} horizontalSpacing="xs" fz="sm">
                        <Table.Tbody>
                          {ids.map((id, index) => {
                            const task = byId.get(id);
                            return (
                              <Table.Tr key={`${id}-${index}`}>
                                <Table.Td w={36} ff="monospace" c="dimmed">
                                  {index + 1}
                                </Table.Td>
                                <Table.Td w={60} ff="monospace" c="dimmed">
                                  {id}
                                </Table.Td>
                                <Table.Td>
                                  {task ? (
                                    <Anchor href={`/tasks/${id}`} target="_blank" c="bright" fw={600}>
                                      {task.name}
                                    </Anchor>
                                  ) : (
                                    <Text size="sm" c="red">
                                      {isPending ? '…' : t('Task not found for id = %{id}', { id })}
                                    </Text>
                                  )}
                                </Table.Td>
                                <Table.Td w={110}>{task && <LevelBadge level={task.level} />}</Table.Td>
                                <Table.Td w={96}>
                                  <Group gap={2} wrap="nowrap" justify="flex-end">
                                    <Tooltip label={t('Move up')}>
                                      <ActionIcon
                                        size="sm"
                                        variant="subtle"
                                        disabled={index === 0}
                                        onClick={() => move(index, index - 1)}
                                        aria-label={t('Move up')}
                                      >
                                        <IconArrowUp size={14} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label={t('Move down')}>
                                      <ActionIcon
                                        size="sm"
                                        variant="subtle"
                                        disabled={index === ids.length - 1}
                                        onClick={() => move(index, index + 1)}
                                        aria-label={t('Move down')}
                                      >
                                        <IconArrowDown size={14} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label={t('Remove')}>
                                      <ActionIcon
                                        size="sm"
                                        variant="subtle"
                                        color="red"
                                        onClick={() => setIds(ids.filter((_, i) => i !== index))}
                                        aria-label={t('Remove')}
                                      >
                                        <IconX size={14} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea.Autosize>
                  )}
                </Card>
              </>
            )}
            <Text size="xs" c="dimmed">
              {t('%{count} tasks', { count: mode === 'ids' ? parseIds(rawIds)?.length ?? 0 : ids.length })}
            </Text>
          </Stack>

          <Group justify="flex-end">
            <Button component="a" href={editing ? `/task_packs/${pack.id}` : '/task_packs'}>
              {t('Cancel')}
            </Button>
            <Button
              type="submit"
              variant="filled"
              color="green"
              loading={form.processing}
              disabled={rawIdsInvalid || !form.data.name.trim()}
            >
              {editing ? t('Save') : t('Create')}
            </Button>
          </Group>
        </Stack>
      </Card>
    </AppLayout>
  );
}
