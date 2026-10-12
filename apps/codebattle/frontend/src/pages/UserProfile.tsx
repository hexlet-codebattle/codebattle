import { Head } from '@inertiajs/react';
import { Button, Card, Center, Grid, Loader, Stack, Tabs, Text, Title } from '@mantine/core';
import { IconChartBar, IconHistory, IconTrophy } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fetchProfile, NotFoundError } from '@/features/profile/api';
import { Heatmap } from '@/features/profile/components/Heatmap';
import { GamesTab, TournamentsTab } from '@/features/profile/components/History';
import { ResultsCard, RivalsAndLanguages, StatsCard } from '@/features/profile/components/Overview';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { AchievementsCard, SeasonsCard } from '@/features/profile/components/Sidebar';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from UserController.show (render_inertia("UserProfile", ...)).
interface UserProfileProps {
  /** As in the URL (/users/:id); the API answers 404 for unknown or non-numeric ids. */
  user_id: string;
}

type Tab = 'overview' | 'tournaments' | 'games';

export default function UserProfile() {
  const { t } = useTranslation();
  const { user_id: userId } = useSharedProps<UserProfileProps>();
  const [tab, setTab] = useState<Tab>('overview');
  const { data: profile, error, isPending } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
    retry: (count, failure) => !(failure instanceof NotFoundError) && count < 2,
  });

  let content;
  if (isPending) {
    content = (
      <Center py={120}>
        <Loader />
      </Center>
    );
  } else if (error || !profile) {
    content = (
      <Card maw={480} mx="auto" mt="xl" ta="center" padding="xl">
        <Stack align="center" gap="sm">
          <Title order={3}>{error instanceof NotFoundError ? t('Player not found') : t("Couldn't load this profile.")}</Title>
          <Text c="dimmed" size="sm">
            {error instanceof NotFoundError
              ? t('There is no player with this id.')
              : t('Something went wrong. Try again.')}
          </Text>
          <Button component="a" href="/">
            {t('Back to lobby')}
          </Button>
        </Stack>
      </Card>
    );
  } else {
    content = (
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            <ProfileHeader profile={profile} />
            <AchievementsCard profile={profile} />
            <SeasonsCard profile={profile} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="lg">
            <StatsCard profile={profile} />
            {/* Panels mount only when opened, so history loads on demand. */}
            <Tabs value={tab} onChange={(value) => setTab((value as Tab) ?? 'overview')} keepMounted={false}>
              <Tabs.List mb="md">
                <Tabs.Tab value="overview" leftSection={<IconChartBar size={14} />}>
                  {t('Statistics')}
                </Tabs.Tab>
                <Tabs.Tab value="tournaments" leftSection={<IconTrophy size={14} />}>
                  {t('Tournaments')}
                </Tabs.Tab>
                <Tabs.Tab value="games" leftSection={<IconHistory size={14} />}>
                  {t('Completed games')}
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="overview">
                <Stack gap="lg">
                  <ResultsCard profile={profile} />
                  <Heatmap userId={userId} />
                  <RivalsAndLanguages profile={profile} userId={userId} />
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="tournaments">
                <TournamentsTab userId={userId} />
              </Tabs.Panel>
              <Tabs.Panel value="games">
                <GamesTab userId={userId} />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Grid.Col>
      </Grid>
    );
  }

  return (
    <AppLayout>
      <Head title={profile ? profile.user.name : t('Profile')} />
      {content}
    </AppLayout>
  );
}
