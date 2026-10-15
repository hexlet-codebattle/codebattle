import { Head } from '@inertiajs/react';
import { Button, Card, Divider, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconCrown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { SeasonCard } from '@/features/seasons/SeasonCard';
import type { Season, SeasonResult } from '@/features/seasons/types';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from SeasonController.index: newest first, each with its top three.
interface SeasonsProps {
  seasons: (Season & { top3: SeasonResult[] })[];
}

export default function Seasons() {
  const { t } = useTranslation();
  const { seasons } = useSharedProps<SeasonsProps>();

  // Grouped by year, newest first (the server already orders them).
  const years = [...new Set(seasons.map((season) => season.year))];

  return (
    <AppLayout>
      <Head title={t('Seasons')} />
      <PageHeader
        title={t('Seasons')}
        subtitle={t('Four seasons a year. Points reset every season; champions stay forever.')}
        actions={
          <Button component="a" href="/hall_of_fame" size="compact-sm" variant="subtle" leftSection={<IconCrown size={14} />}>
            {t('Hall of Fame')}
          </Button>
        }
      />

      {seasons.length === 0 ? (
        <Card maw={560} mx="auto">
          <Text c="dimmed" ta="center" py="lg">
            {t('No seasons yet')}
          </Text>
        </Card>
      ) : (
        <Stack gap="xl">
          {years.map((year) => (
            <Stack key={year} gap="md">
              <Divider
                label={
                  <Text ff="var(--cb-font-display)" fw={800} fz="lg" c="bright">
                    {year}
                  </Text>
                }
                labelPosition="center"
              />
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                {seasons
                  .filter((season) => season.year === year)
                  .map((season) => (
                    <SeasonCard key={season.id} season={season} top3={season.top3} />
                  ))}
              </SimpleGrid>
            </Stack>
          ))}
        </Stack>
      )}
    </AppLayout>
  );
}
