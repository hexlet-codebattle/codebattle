import { Head } from '@inertiajs/react';
import { ActionIcon, Anchor, Button, Card, Center, Group, ScrollArea, Table, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconPencil, IconPlus, IconSearch, IconSelector } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ClanFormModal } from '@/features/clans/ClanFormModal';
import { type Clan, utc } from '@/features/clans/types';
import { UserCard } from '@/features/users/UserCard';
import { getLocale } from '@/i18n';
import { AppLayout } from '@/layout/AppLayout';
import { MethodButton } from '@/shared/MethodButton';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

type SortField = 'name' | 'players_count' | 'created_at';

interface ClanIndexProps {
  clans: Clan[];
  sort: SortField;
  order: 'asc' | 'desc';
}

/** Column header that links to ?sort=&order= (sorting stays server-side, as in the legacy page). */
function SortHeader({ field, label, sort, order }: { field: SortField; label: string } & Omit<ClanIndexProps, 'clans'>) {
  const active = sort === field;
  const nextOrder = active && order === 'asc' ? 'desc' : 'asc';
  const Icon = active ? (order === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector;

  return (
    <UnstyledButton component="a" href={`/clans?sort=${field}&order=${nextOrder}`}>
      <Group gap={4} wrap="nowrap">
        <span>{label}</span>
        <Icon size={12} />
      </Group>
    </UnstyledButton>
  );
}

export default function ClanIndex() {
  const { t } = useTranslation();
  const { clans, sort, order, current_user: me } = useSharedProps<ClanIndexProps>();
  const [search, setSearch] = useState('');
  // undefined: closed, null: creating, a clan: editing it.
  const [formClan, setFormClan] = useState<Clan | null | undefined>(undefined);
  const canEdit = (clan: Clan) => Boolean(me.is_admin) || clan.creator?.id === me.id;
  // The creator can drop a clan once nobody is left in it; admins any clan.
  const canDelete = (clan: Clan) => Boolean(me.is_admin) || (clan.creator?.id === me.id && !clan.users_count);
  const anyEditable = clans.some((clan) => canEdit(clan) || canDelete(clan));
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }), []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? clans.filter((clan) => `${clan.name ?? ''} ${clan.long_name ?? ''}`.toLowerCase().includes(term))
      : clans;
  }, [clans, search]);

  return (
    <AppLayout>
      <Head title={t('Clans')} />
      <PageHeader
        title={t('Clans')}
        subtitle={t('Total clans: %{count}', { count: clans.length })}
        actions={
          <Button size="compact-sm" variant="default" leftSection={<IconPlus size={14} />} onClick={() => setFormClan(null)}>
            {t('Create clan')}
          </Button>
        }
      />

      <TextInput
        placeholder={t('Search clans')}
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        w={{ base: '100%', sm: 320 }}
        mb="sm"
      />

      <Card padding={0}>
        <ScrollArea type="auto">
          <Table miw={620}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <SortHeader field="name" label={t('Name')} sort={sort} order={order} />
                </Table.Th>
                <Table.Th ta="right">
                  <SortHeader field="players_count" label={t('Players')} sort={sort} order={order} />
                </Table.Th>
                <Table.Th>{t('Creator')}</Table.Th>
                <Table.Th>
                  <SortHeader field="created_at" label={t('Created at')} sort={sort} order={order} />
                </Table.Th>
                {anyEditable && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((clan) => (
                <Table.Tr key={clan.id}>
                  <Table.Td>
                    <Anchor href={`/clans/${clan.id}`} fw={600} c="bright">
                      {clan.name || t('Unnamed clan')}
                    </Anchor>
                    {clan.long_name && clan.long_name !== clan.name && (
                      <Text fz={11} c="dimmed" lineClamp={1}>
                        {clan.long_name}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {clan.users_count ?? 0}
                  </Table.Td>
                  <Table.Td>
                    {clan.creator ? (
                      <UserCard user={clan.creator}>
                        <Text span size="sm">
                          {clan.creator.name}
                        </Text>
                      </UserCard>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {dateFormat.format(new Date(utc(clan.inserted_at)))}
                    </Text>
                  </Table.Td>
                  {anyEditable && (
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        {canEdit(clan) && (
                          <Tooltip label={t('Edit clan')}>
                            <ActionIcon size="sm" variant="subtle" onClick={() => setFormClan(clan)} aria-label={t('Edit clan')}>
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {canDelete(clan) && (
                          <MethodButton
                            action={`/clans/${clan.id}`}
                            method="delete"
                            variant="subtle"
                            color="red"
                            confirm={t('Delete this clan?')}
                          >
                            {t('Delete')}
                          </MethodButton>
                        )}
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
              {t('No clans found')}
            </Text>
          </Center>
        )}
      </Card>

      <ClanFormModal
        key={formClan === undefined ? 'closed' : (formClan?.id ?? 'new')}
        opened={formClan !== undefined}
        clan={formClan ?? null}
        onClose={() => setFormClan(undefined)}
      />
    </AppLayout>
  );
}
