import { Head } from '@inertiajs/react';
import { Stack } from '@mantine/core';

import { DuelHero } from '@/features/headToHead/DuelHero';
import { GamesTable } from '@/features/headToHead/GamesTable';
import type { HeadToHeadData } from '@/features/headToHead/types';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from HeadToHeadController.show.
interface HeadToHeadProps {
  page_title: string;
  head_to_head: HeadToHeadData;
}

/** Duel history of two players: score, totals and every shared game. */
export default function HeadToHead() {
  const { page_title: pageTitle, head_to_head: data } = useSharedProps<HeadToHeadProps>();

  return (
    <AppLayout>
      <Head title={pageTitle} />
      <Stack gap="xl">
        <DuelHero data={data} />
        <GamesTable games={data.games ?? []} players={data.players} />
      </Stack>
    </AppLayout>
  );
}
