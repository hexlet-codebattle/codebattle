import { Head } from '@inertiajs/react';
import { Card, Center, Group, Text } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NextStageGroupTournamentModal } from '@/features/publicEvent/NextStageGroupTournamentModal';
import { buildParticipantStages, findPendingStage, type ParticipantStage } from '@/features/publicEvent/participant';
import classes from '@/features/publicEvent/PublicEvent.module.css';
import { StageConfirmationModal } from '@/features/publicEvent/StageConfirmationModal';
import { StageTable } from '@/features/publicEvent/StageTable';
import type { PublicEventProps } from '@/features/publicEvent/types';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import type { CurrentUser } from '@/shared/types';
import { useSharedProps } from '@/shared/useSharedProps';

const TROPHY = '/assets/images/event/trophy.png';

// Event participant dashboard (PublicEventController.show; also "/" in event mode).
export default function PublicEvent() {
  const { t } = useTranslation();
  const {
    event: data,
    current_user: currentUser,
    external_platform_name: externalPlatformName,
  } = useSharedProps<PublicEventProps>();
  const { event, user_event: userEvent } = data;
  const user = currentUser as CurrentUser & { category?: string | null };
  const [confirming, setConfirming] = useState<ParticipantStage | null>(null);

  const stages = useMemo(() => buildParticipantStages(event, userEvent), [event, userEvent]);
  const pending = findPendingStage(stages);

  return (
    <AppLayout>
      <Head title={event.title || t('Participant Dashboard')} />

      {event.ticker_text && (
        <div className={classes.ticker} role="status">
          {event.ticker_text}
        </div>
      )}

      <PageHeader
        title={
          <Group gap="xs" justify="center" wrap="nowrap">
            <img src={TROPHY} alt="" className={classes.trophy} />
            {t('Participant Dashboard')}
          </Group>
        }
        subtitle={event.title || undefined}
        actions={
          (user.clan || user.category) && (
            <Group gap="md" className={classes.profile}>
              {user.clan && (
                <span>
                  {t('Clan')}: <strong>{user.clan}</strong>
                </span>
              )}
              {user.category && (
                <span>
                  {t('Category')}: <strong>{user.category}</strong>
                </span>
              )}
            </Group>
          )
        }
      />

      <Card padding={0}>
        {stages.length === 0 ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              {t('No stages yet.')}
            </Text>
          </Center>
        ) : (
          <StageTable stages={stages} onStart={setConfirming} />
        )}
      </Card>

      <StageConfirmationModal eventSlug={event.slug} stage={confirming} onClose={() => setConfirming(null)} />
      <NextStageGroupTournamentModal
        groupTournamentId={pending?.groupTournamentId ?? null}
        externalPlatformName={externalPlatformName}
      />
    </AppLayout>
  );
}
