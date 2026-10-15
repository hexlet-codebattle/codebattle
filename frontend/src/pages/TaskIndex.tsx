import { Head } from '@inertiajs/react';
import { Anchor, Button, Card, Center, Group, ScrollArea, SegmentedControl, Table, Text, TextInput } from '@mantine/core';
import { IconPackages, IconPlayerPause, IconPlayerPlay, IconSearch, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LEVELS, levelLabel } from '@/features/lobby/format';
import { CreatorCell, LevelBadge, SecondsCell, StateBadge, Tags, type TaskRow } from '@/features/tasks/shared';
import { AppLayout } from '@/layout/AppLayout';
import { MethodActionIcon } from '@/shared/MethodButton';
import { PageHeader } from '@/shared/PageHeader';
import { SortTh, Timestamp, useSort } from '@/shared/sortable';
import { useSharedProps } from '@/shared/useSharedProps';

const PAGE = 50;

const ACCESSORS = {
  id: (task: TaskRow) => task.id,
  name: (task: TaskRow) => task.name,
  // Difficulty order, not alphabetical.
  level: (task: TaskRow) => LEVELS.indexOf(task.level),
  time_to_solve_sec: (task: TaskRow) => task.time_to_solve_sec,
  base_score: (task: TaskRow) => task.base_score,
  state: (task: TaskRow) => task.state,
  creator: (task: TaskRow) => task.creator?.name,
  inserted_at: (task: TaskRow) => task.inserted_at,
  updated_at: (task: TaskRow) => task.updated_at,
};

export default function TaskIndex() {
  const { t } = useTranslation();
  const { tasks, current_user: me } = useSharedProps<{ tasks: TaskRow[] }>();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter(
      (task) =>
        (level === 'all' || task.level === level) &&
        (!term ||
          task.name.toLowerCase().includes(term) ||
          String(task.id) === term ||
          task.tags.some((tag) => tag.toLowerCase().includes(term))),
    );
  }, [tasks, search, level]);

  // Same default order as the server (most recently updated first).
  const { sorted, sort, toggle } = useSort(filtered, ACCESSORS, { key: 'updated_at', dir: 'desc' });
  const th = { sort, onSort: toggle };
  const shown = sorted.slice(0, limit);

  return (
    <AppLayout wide>
      <Head title={t('Tasks')} />
      <PageHeader
        title={t('Tasks')}
        subtitle={t('%{count} tasks', { count: tasks.length })}
        actions={
          <Button component="a" href="/task_packs" variant="subtle" size="compact-sm" leftSection={<IconPackages size={14} />}>
            {t('Task packs')}
          </Button>
        }
      />

      <Group justify="space-between" mb="sm" gap="sm">
        <TextInput
          placeholder={t('Search by name, tag or id')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setLimit(PAGE);
          }}
          w={{ base: '100%', sm: 320 }}
        />
        <SegmentedControl
          size="xs"
          value={level}
          onChange={(value) => {
            setLevel(value);
            setLimit(PAGE);
          }}
          data={[{ value: 'all', label: t('All') }, ...LEVELS.map((value) => ({ value, label: levelLabel(value) }))]}
        />
      </Group>

      <Card padding={0}>
        <ScrollArea type="auto">
          <Table miw={1100} stickyHeader verticalSpacing={4} horizontalSpacing="xs" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <SortTh column="id" w={70} {...th}>
                  id
                </SortTh>
                <SortTh column="name" {...th}>
                  name
                </SortTh>
                <SortTh column="level" {...th}>
                  level
                </SortTh>
                <Table.Th tt="none" ff="monospace" fz="xs" fw={600} lts={0}>
                  tags
                </Table.Th>
                <SortTh column="time_to_solve_sec" ta="right" {...th}>
                  time_to_solve_sec
                </SortTh>
                <SortTh column="base_score" ta="right" {...th}>
                  base_score
                </SortTh>
                <SortTh column="state" {...th}>
                  state
                </SortTh>
                <SortTh column="creator" {...th}>
                  creator
                </SortTh>
                <SortTh column="inserted_at" {...th}>
                  inserted_at
                </SortTh>
                <SortTh column="updated_at" {...th}>
                  updated_at
                </SortTh>
                {me.is_admin && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shown.map((task) => (
                <Table.Tr key={task.id}>
                  <Table.Td ff="monospace" c="dimmed">
                    {task.id}
                  </Table.Td>
                  <Table.Td>
                    <Anchor href={`/tasks/${task.id}`} fw={600} c="bright">
                      {task.name}
                    </Anchor>
                    <Text fz={11} c="dimmed">
                      {task.origin} · {task.visibility}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <LevelBadge level={task.level} />
                  </Table.Td>
                  <Table.Td>
                    <Tags tags={task.tags} />
                  </Table.Td>
                  <Table.Td ta="right" style={{ whiteSpace: 'nowrap' }}>
                    <SecondsCell value={task.time_to_solve_sec} />
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {task.base_score ?? '—'}
                  </Table.Td>
                  <Table.Td>
                    <StateBadge state={task.state} />
                  </Table.Td>
                  <Table.Td>
                    <CreatorCell creator={task.creator} />
                  </Table.Td>
                  <Table.Td c="dimmed">
                    <Timestamp value={task.inserted_at} />
                  </Table.Td>
                  <Table.Td c="dimmed">
                    <Timestamp value={task.updated_at} />
                  </Table.Td>
                  {me.is_admin && (
                    <Table.Td>
                      <Group gap={2} wrap="nowrap" justify="flex-end">
                        {task.state === 'active' ? (
                          <MethodActionIcon
                            action={`/tasks/${task.id}/disable`}
                            method="patch"
                            label={t('Disable')}
                            icon={<IconPlayerPause size={15} />}
                          />
                        ) : (
                          <MethodActionIcon
                            action={`/tasks/${task.id}/activate`}
                            method="patch"
                            color="green"
                            label={t('Activate')}
                            icon={<IconPlayerPlay size={15} />}
                          />
                        )}
                        <MethodActionIcon
                          action={`/tasks/${task.id}`}
                          method="delete"
                          color="red"
                          label={t('Delete')}
                          icon={<IconTrash size={15} />}
                          confirm={t('Delete task "%{name}"?', { name: task.name })}
                        />
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        {filtered.length === 0 && (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              {t('No tasks match')}
            </Text>
          </Center>
        )}
        {filtered.length > limit && (
          <Center py="sm">
            <Button size="compact-sm" onClick={() => setLimit((value) => value + PAGE)}>
              {t('Show more (%{count} left)', { count: filtered.length - limit })}
            </Button>
          </Center>
        )}
      </Card>
    </AppLayout>
  );
}
