import { Head } from '@inertiajs/react';
import { Anchor, Button, Card, Center, Group, ScrollArea, Table, Text } from '@mantine/core';
import { IconList, IconPlayerPause, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { CreatorCell, StateBadge, type TaskPack } from '@/features/tasks/shared';
import { AppLayout } from '@/layout/AppLayout';
import { MethodActionIcon } from '@/shared/MethodButton';
import { PageHeader } from '@/shared/PageHeader';
import { SortTh, Timestamp, useSort } from '@/shared/sortable';
import { useSharedProps } from '@/shared/useSharedProps';

const ACCESSORS = {
  name: (pack: TaskPack) => pack.name,
  task_ids: (pack: TaskPack) => pack.task_ids.length,
  state: (pack: TaskPack) => pack.state,
  visibility: (pack: TaskPack) => pack.visibility,
  creator: (pack: TaskPack) => pack.creator?.name,
  inserted_at: (pack: TaskPack) => pack.inserted_at,
  updated_at: (pack: TaskPack) => pack.updated_at,
};

export default function TaskPackIndex() {
  const { t } = useTranslation();
  const { task_packs: packs, current_user: me } = useSharedProps<{ task_packs: TaskPack[] }>();
  const { sorted, sort, toggle } = useSort(packs, ACCESSORS, { key: 'name', dir: 'asc' });
  const th = { sort, onSort: toggle };

  return (
    <AppLayout wide>
      <Head title={t('Task Packs')} />
      <PageHeader
        title={t('Task Packs')}
        subtitle={t('Ordered sets of tasks for tournaments.')}
        actions={
          <>
            {/* Create/edit forms still live in the legacy UI. */}
            <Button component="a" href="/task_packs/new" variant="light" size="compact-sm" leftSection={<IconPlus size={14} />}>
              {t('Create new task pack')}
            </Button>
            <Button component="a" href="/tasks" variant="subtle" size="compact-sm" leftSection={<IconList size={14} />}>
              {t('Tasks')}
            </Button>
          </>
        }
      />

      <Card padding={0}>
        {packs.length === 0 ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              {t('No task packs yet.')}
            </Text>
          </Center>
        ) : (
          <ScrollArea type="auto">
            <Table miw={900} verticalSpacing={4} horizontalSpacing="xs" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <SortTh column="name" {...th}>
                    name
                  </SortTh>
                  <SortTh column="task_ids" ta="right" {...th}>
                    task_ids
                  </SortTh>
                  <SortTh column="state" {...th}>
                    state
                  </SortTh>
                  <SortTh column="visibility" {...th}>
                    visibility
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
                {sorted.map((pack) => (
                  <Table.Tr key={pack.id}>
                    <Table.Td>
                      <Anchor href={`/task_packs/${pack.id}`} fw={600} c="bright">
                        {pack.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      {pack.task_ids.length}
                    </Table.Td>
                    <Table.Td>
                      <StateBadge state={pack.state} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {pack.visibility}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <CreatorCell creator={pack.creator} />
                    </Table.Td>
                    <Table.Td c="dimmed">
                      <Timestamp value={pack.inserted_at} />
                    </Table.Td>
                    <Table.Td c="dimmed">
                      <Timestamp value={pack.updated_at} />
                    </Table.Td>
                    {me.is_admin && (
                      <Table.Td>
                        <Group gap={2} wrap="nowrap" justify="flex-end">
                          {pack.state === 'active' ? (
                            <MethodActionIcon
                              action={`/task_packs/${pack.id}/disable`}
                              method="patch"
                              label={t('Disable')}
                              icon={<IconPlayerPause size={15} />}
                            />
                          ) : (
                            <MethodActionIcon
                              action={`/task_packs/${pack.id}/activate`}
                              method="patch"
                              color="green"
                              label={t('Activate')}
                              icon={<IconPlayerPlay size={15} />}
                            />
                          )}
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </AppLayout>
  );
}
