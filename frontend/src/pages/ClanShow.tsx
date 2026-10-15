import { Head } from '@inertiajs/react';
import { Button, Card, Center, Grid, Group, ScrollArea, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { IconArrowLeft, IconPencil } from '@tabler/icons-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ClanFormModal } from '@/features/clans/ClanFormModal';
import { type Clan, type ClanMember, utc } from '@/features/clans/types';
import { UserCard } from '@/features/users/UserCard';
import { getLocale } from '@/i18n';
import { AppLayout } from '@/layout/AppLayout';
import { LangIcon } from '@/shared/LangIcon';
import { PageHeader } from '@/shared/PageHeader';
import { UserAvatar } from '@/shared/UserAvatar';
import { useSharedProps } from '@/shared/useSharedProps';

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts="0.04em">
        {label}
      </Text>
      <Text size="sm" fw={600} c="bright" component="div">
        {value}
      </Text>
    </Stack>
  );
}

export default function ClanShow() {
  const { t } = useTranslation();
  const { clan, members, can_edit: canEdit } = useSharedProps<{ clan: Clan; members: ClanMember[]; can_edit?: boolean }>();
  const [editing, setEditing] = useState(false);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }), []);
  // Strongest first: Elo, then name.
  const sorted = useMemo(
    () => [...members].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name)),
    [members],
  );
  const name = clan.name || t('Unnamed clan');

  return (
    <AppLayout>
      <Head title={name} />
      <PageHeader
        title={name}
        subtitle={clan.long_name && clan.long_name !== clan.name ? clan.long_name : undefined}
        actions={
          <>
            <Button component="a" href="/clans" variant="subtle" size="compact-sm" leftSection={<IconArrowLeft size={14} />}>
              {t('Clans')}
            </Button>
            {canEdit && (
              <Button variant="default" size="compact-sm" leftSection={<IconPencil size={14} />} onClick={() => setEditing(true)}>
                {t('Edit clan')}
              </Button>
            )}
          </>
        }
      />

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card>
            <SimpleGrid cols={2} spacing="md">
              <Fact label={t('Players')} value={members.length} />
              <Fact label={t('Created at')} value={dateFormat.format(new Date(utc(clan.inserted_at)))} />
              <Fact
                label={t('Creator')}
                value={
                  clan.creator ? (
                    <UserCard user={clan.creator}>
                      <span>{clan.creator.name}</span>
                    </UserCard>
                  ) : (
                    '—'
                  )
                }
              />
            </SimpleGrid>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card padding={0}>
            {sorted.length === 0 ? (
              <Center py="xl">
                <Text size="sm" c="dimmed">
                  {t('No members yet.')}
                </Text>
              </Center>
            ) : (
              <ScrollArea type="auto">
                <Table miw={520}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('Player')}</Table.Th>
                      <Table.Th ta="right">{t('Elo')}</Table.Th>
                      <Table.Th ta="right">{t('Place')}</Table.Th>
                      <Table.Th ta="right">{t('Points')}</Table.Th>
                      <Table.Th>{t('Joined')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sorted.map((member) => (
                      <Table.Tr key={member.id}>
                        <Table.Td>
                          <Group gap={8} wrap="nowrap">
                            <UserAvatar user={member} size={26} />
                            <LangIcon lang={member.lang} />
                            <UserCard user={member}>
                              <Text span size="sm" fw={600} c="bright">
                                {member.name}
                              </Text>
                            </UserCard>
                          </Group>
                        </Table.Td>
                        <Table.Td ta="right" ff="monospace">
                          {member.rating ?? '—'}
                        </Table.Td>
                        <Table.Td ta="right" ff="monospace">
                          {member.points ? `#${member.rank}` : '—'}
                        </Table.Td>
                        <Table.Td ta="right" ff="monospace">
                          {member.points ?? 0}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {dateFormat.format(new Date(utc(member.inserted_at)))}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {canEdit && <ClanFormModal key={clan.id} opened={editing} clan={clan} onClose={() => setEditing(false)} />}
    </AppLayout>
  );
}
