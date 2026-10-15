import { Head } from '@inertiajs/react';
import { Button, Card, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconCalendarStats, IconChevronRight, IconCrown, IconListNumbers } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LeaderboardTable } from '@/features/seasons/LeaderboardTable';
import { PlayerInsights } from '@/features/seasons/PlayerInsights';
import { Podium } from '@/features/seasons/Podium';
import { SeasonCard } from '@/features/seasons/SeasonCard';
import { SeasonHero } from '@/features/seasons/SeasonHero';
import { SeasonStats } from '@/features/seasons/SeasonStats';
import type { Season, SeasonResult } from '@/features/seasons/types';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from HallOfFameController.index.
interface HallOfFameProps {
  current_season: Season | null;
  /** Top 100 of the current season. */
  current_season_results: SeasonResult[];
  current_season_players?: number;
  previous_seasons_winners: { season: Season; winners: SeasonResult[] }[];
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Title order={3} ta="center">
      {children}
    </Title>
  );
}

export default function HallOfFame() {
  const { t } = useTranslation();
  const props = useSharedProps<HallOfFameProps>();
  const season = props.current_season;
  const results = props.current_season_results;
  const [selected, setSelected] = useState<SeasonResult | null>(null);

  return (
    <AppLayout>
      <Head title={t('Hall of Fame')} />
      <PageHeader
        title={
          <>
            <IconCrown size={26} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--cb-medal-1)' }} />
            {t('Hall of Fame')}
          </>
        }
        subtitle={t('Codebattle League champions, season by season.')}
        actions={
          <Button component="a" href="/seasons" size="compact-sm" variant="subtle" leftSection={<IconCalendarStats size={14} />}>
            {t('View All Seasons')}
          </Button>
        }
      />

      <Stack gap={40}>
        {season ? (
          <Stack gap="xl">
            <SeasonHero
              season={season}
              actions={
                <Button
                  component="a"
                  href={`/seasons/${season.id}`}
                  variant="default"
                  size="sm"
                  leftSection={<IconListNumbers size={16} />}
                  rightSection={<IconChevronRight size={14} />}
                >
                  {t('Full Results')}
                </Button>
              }
            />

            {results.length > 0 ? (
              <>
                <Stack gap="xl">
                  <SectionTitle>{t('Top 3')}</SectionTitle>
                  <Podium results={results} onSelect={setSelected} />
                </Stack>
                <LeaderboardTable
                  results={results}
                  onInsights={setSelected}
                  title={t('Current Season Leaderboard')}
                  caption={
                    props.current_season_players && props.current_season_players > results.length
                      ? t('Top %{count} of %{total} players', { count: results.length, total: props.current_season_players })
                      : undefined
                  }
                />
                <SeasonStats results={results} partial={results.length < (props.current_season_players ?? 0)} />
                <PlayerInsights
                  season={season}
                  player={selected}
                  results={results}
                  totalPlayers={props.current_season_players}
                  onClose={() => setSelected(null)}
                />
              </>
            ) : (
              <Card>
                <Text c="dimmed" ta="center" py="lg">
                  {t('No results this season yet.')}
                </Text>
              </Card>
            )}
          </Stack>
        ) : (
          <Card>
            <Text c="dimmed" ta="center" py="lg">
              {t('No active season')}
            </Text>
          </Card>
        )}

        {props.previous_seasons_winners.length > 0 && (
          <Stack gap="lg">
            <SectionTitle>{t('Previous Seasons Champions')}</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {props.previous_seasons_winners.map(({ season: past, winners }) => (
                <SeasonCard key={past.id} season={past} top3={winners} />
              ))}
            </SimpleGrid>
          </Stack>
        )}
      </Stack>
    </AppLayout>
  );
}
