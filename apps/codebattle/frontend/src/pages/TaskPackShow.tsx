import { Head } from '@inertiajs/react';
import { Anchor, Badge, Button, Card, Group, ScrollArea, Table, Text } from '@mantine/core';
import { IconArrowLeft, IconClock, IconPencil } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { FieldTh, formatSeconds, LevelBadge, SecondsCell, StateBadge, Tags, type TaskPack, type TaskRow } from '@/features/tasks/shared';
import { AppLayout } from '@/layout/AppLayout';
import { MethodButton } from '@/shared/MethodButton';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

interface TaskPackShowProps {
  task_pack: TaskPack;
  tasks: TaskRow[];
  /** Creator or admin: may edit/delete. */
  can_edit: boolean;
}

export default function TaskPackShow() {
  const { t } = useTranslation();
  const { task_pack: pack, tasks, can_edit: canEdit } = useSharedProps<TaskPackShowProps>();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const totalSeconds = tasks.every((task) => task.time_to_solve_sec)
    ? tasks.reduce((sum, task) => sum + (task.time_to_solve_sec ?? 0), 0)
    : null;

  return (
    <AppLayout wide>
      <Head title={pack.name} />
      <PageHeader
        title={pack.name}
        subtitle={
          <Group gap="xs" justify="center" component="span">
            <StateBadge state={pack.state} />
            <Badge size="xs" variant="default">
              {pack.visibility}
            </Badge>
            <Text span size="sm" c="dimmed">
              {t('%{count} tasks', { count: pack.task_ids.length })}
            </Text>
            {totalSeconds != null && totalSeconds > 0 && (
              <Group gap={4} component="span">
                <IconClock size={14} />
                <Text span size="sm" c="dimmed">
                  {formatSeconds(totalSeconds)}
                </Text>
              </Group>
            )}
          </Group>
        }
        actions={
          <>
            <Button component="a" href="/task_packs" variant="subtle" size="compact-sm" leftSection={<IconArrowLeft size={14} />}>
              {t('Task Packs')}
            </Button>
            {canEdit && (
              <>
                <Button
                  component="a"
                  href={`/task_packs/${pack.id}/edit`}
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconPencil size={14} />}
                >
                  {t('Edit')}
                </Button>
                <MethodButton
                  action={`/task_packs/${pack.id}`}
                  method="delete"
                  variant="subtle"
                  color="red"
                  size="compact-sm"
                  confirm={t('Delete task pack?')}
                >
                  {t('Delete')}
                </MethodButton>
              </>
            )}
          </>
        }
      />

      <Card padding={0}>
        <ScrollArea type="auto">
          <Table miw={980} verticalSpacing={4} horizontalSpacing="xs" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <FieldTh w={40}>index</FieldTh>
                <FieldTh w={64}>id</FieldTh>
                <FieldTh>name</FieldTh>
                <FieldTh>level</FieldTh>
                <FieldTh>tags</FieldTh>
                <FieldTh>origin</FieldTh>
                <FieldTh ta="right">base_score</FieldTh>
                <FieldTh ta="right">time_to_solve_sec</FieldTh>
                <FieldTh>visibility</FieldTh>
                <FieldTh>state</FieldTh>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {/* Pack order is the tournament order, so follow task_ids, not the task list. */}
              {pack.task_ids.map((id, index) => {
                const task = byId.get(id);
                return (
                  <Table.Tr key={`${id}-${index}`}>
                    <Table.Td ff="monospace" c="dimmed">
                      {index + 1}
                    </Table.Td>
                    <Table.Td ff="monospace" c="dimmed">
                      {id}
                    </Table.Td>
                    {task ? (
                      <>
                        <Table.Td>
                          <Anchor href={`/tasks/${task.id}`} fw={600} c="bright">
                            {task.name}
                          </Anchor>
                        </Table.Td>
                        <Table.Td>
                          <LevelBadge level={task.level} />
                        </Table.Td>
                        <Table.Td>
                          <Tags tags={task.tags} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {task.origin}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right" ff="monospace">
                          {task.base_score ?? '—'}
                        </Table.Td>
                        <Table.Td ta="right" style={{ whiteSpace: 'nowrap' }}>
                          <SecondsCell value={task.time_to_solve_sec} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {task.visibility}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <StateBadge state={task.state} />
                        </Table.Td>
                      </>
                    ) : (
                      <Table.Td colSpan={8}>
                        <Text size="sm" c="dimmed">
                          {t('Task not found for id = %{id}', { id })}
                        </Text>
                      </Table.Td>
                    )}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </AppLayout>
  );
}
