import { Head } from '@inertiajs/react';
import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconCalendarStats, IconChevronLeft, IconChevronRight, IconCrown } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LeaderboardTable } from '@/features/seasons/LeaderboardTable';
import { PlayerInsights } from '@/features/seasons/PlayerInsights';
import { Podium } from '@/features/seasons/Podium';
import { SeasonHero } from '@/features/seasons/SeasonHero';
import { SeasonStats } from '@/features/seasons/SeasonStats';
import { type Season, type SeasonResult, seasonStatus, seasonTitle } from '@/features/seasons/types';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from SeasonController.show; `seasons` (newest first) is only sent to the new frontend.
interface SeasonShowProps {
  season: Season;
  results: SeasonResult[];
  seasons?: Season[];
}

export default function SeasonShow() {
  const { t } = useTranslation();
  const { season, results, seasons = [] } = useSharedProps<SeasonShowProps>();
  const [selected, setSelected] = useState<SeasonResult | null>(null);

  const index = seasons.findIndex((item) => item.id === season.id);
  const newer = index > 0 ? seasons[index - 1] : null;
  const older = index >= 0 && index < seasons.length - 1 ? seasons[index + 1] : null;
  const finished = seasonStatus(season) === 'finished';

  return (
    <AppLayout>
      <Head title={seasonTitle(season)} />
      <Stack gap="xl">
        <Group justify="space-between" gap="xs">
          <Button
            component="a"
            href={older ? `/seasons/${older.id}` : undefined}
            disabled={!older}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconChevronLeft size={14} />}
          >
            {older ? seasonTitle(older) : t('Older')}
          </Button>
          <Group gap="xs">
            <Button component="a" href="/seasons" variant="subtle" size="compact-sm" leftSection={<IconCalendarStats size={14} />}>
              {t('All Seasons')}
            </Button>
            <Button component="a" href="/hall_of_fame" variant="subtle" size="compact-sm" leftSection={<IconCrown size={14} />}>
              {t('Hall of Fame')}
            </Button>
          </Group>
          <Button
            component="a"
            href={newer ? `/seasons/${newer.id}` : undefined}
            disabled={!newer}
            variant="subtle"
            size="compact-sm"
            rightSection={<IconChevronRight size={14} />}
          >
            {newer ? seasonTitle(newer) : t('Newer')}
          </Button>
        </Group>

        <SeasonHero season={season} />

        {results.length === 0 ? (
          <Card>
            <Text c="dimmed" ta="center" py="lg">
              {t('No results yet')}
            </Text>
          </Card>
        ) : (
          <>
            <Stack gap="xl">
              <Title order={3} ta="center">
                {finished ? t('Champions') : t('Top 3')}
              </Title>
              <Podium results={results} onSelect={setSelected} />
            </Stack>
            <LeaderboardTable results={results} onInsights={setSelected} title={t('Full Leaderboard')} />
            <SeasonStats results={results} />
            <PlayerInsights season={season} player={selected} results={results} onClose={() => setSelected(null)} />
          </>
        )}
      </Stack>
    </AppLayout>
  );
}
