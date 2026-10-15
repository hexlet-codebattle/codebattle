import { Head } from '@inertiajs/react';
import { Button, Group } from '@mantine/core';
import { IconArrowLeft, IconTrophy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { StateBadge } from '@/features/schedule/EventModal';
import { type EditableTournament, TournamentForm } from '@/features/tournaments/TournamentForm';
import { UserCard } from '@/features/users/UserCard';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from TournamentController.edit (creator, moderators and admins only).
interface TournamentEditProps {
  tournament: EditableTournament;
  task_pack_names: string[];
}

export default function TournamentEdit() {
  const { t } = useTranslation();
  const { tournament, task_pack_names: taskPackNames = [] } = useSharedProps<TournamentEditProps>();

  return (
    <AppLayout wide>
      <Head title={t('Edit %{name}', { name: tournament.name ?? '' })} />
      <PageHeader
        title={t('Edit Tournament')}
        subtitle={
          <Group gap={8} justify="center" component="span">
            <span>{tournament.name}</span>
            <StateBadge state={tournament.state} />
            {tournament.creator && (
              <span>
                {t('by')}{' '}
                <UserCard user={tournament.creator}>
                  <span>{tournament.creator.name}</span>
                </UserCard>
              </span>
            )}
          </Group>
        }
        actions={
          <>
            <Button
              component="a"
              href={`/tournaments/${tournament.id}`}
              size="compact-sm"
              variant="subtle"
              leftSection={<IconArrowLeft size={14} />}
            >
              {t('Back to tournament')}
            </Button>
            <Button component="a" href="/tournaments#my" size="compact-sm" variant="subtle" leftSection={<IconTrophy size={14} />}>
              {t('My Tournaments')}
            </Button>
          </>
        }
      />

      <TournamentForm editing={tournament} taskPackNames={taskPackNames} />
    </AppLayout>
  );
}
