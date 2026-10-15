import { Head } from '@inertiajs/react';
import { Alert, Button, Card, Center, Grid, Loader, Stack, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { tournamentTitle } from '@/features/lobby/format';
import { LadderNote } from '@/features/tournament/components/LadderNote';
import { ModeratorControls } from '@/features/tournament/components/ModeratorControls';
import { NextMatchModal } from '@/features/tournament/components/NextMatchModal';
import { PlayerRow, useMyLiveMatch } from '@/features/tournament/components/PlayerBar';
import { RoundClock, SchedulePreview } from '@/features/tournament/components/RoundClock';
import { StandingsCard } from '@/features/tournament/components/SidePanels';
import { TournamentHeader } from '@/features/tournament/components/TournamentHeader';
import { TournamentPanels } from '@/features/tournament/panels/TournamentPanels';
import { useTournamentStore } from '@/features/tournament/store';
import { useRoundSolves } from '@/features/tournament/useRoundSolves';
import { useTournament } from '@/features/tournament/useTournament';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from TournamentController.show (render_tournament/3).
interface TournamentRoomProps {
  tournament_id: number;
  tournament_access_token: string | null;
}

export default function TournamentRoom() {
  const { t } = useTranslation();
  const { current_user: me, tournament_id: id, tournament_access_token: propToken } = useSharedProps<TournamentRoomProps>();
  const accessToken = useMemo(() => new URLSearchParams(window.location.search).get('access_token') ?? propToken, [propToken]);
  const api = useTournament(id, accessToken);
  const tournament = useTournamentStore((state) => state.tournament);
  const matches = useTournamentStore((state) => state.matches);
  const isPlayer = useTournamentStore((state) => Boolean(state.players[me.id]));
  const liveMatch = useMyLiveMatch(me.id);
  const solves = useRoundSolves(api, tournament?.state);

  // A ladder player's own round can lag the tournament's (games run on their own clock).
  const myRound = useMemo(() => {
    const own = Object.values(matches).filter((match) => match.player_ids.includes(me.id));
    return own.length ? Math.max(...own.map((match) => match.round_position)) : null;
  }, [matches, me.id]);

  if (api.status === 'error' && !tournament) {
    return (
      <AppLayout>
        <Head title={t('Tournament')} />
        <Card maw={520} mx="auto" mt="xl" padding="xl">
          <Stack align="center" gap="sm">
            <IconLock size={40} stroke={1.4} />
            <Text fw={700}>{t('Tournament not found')}</Text>
            <Text size="sm" c="dimmed" ta="center">
              {t('It may be private: open it with the invite link from the organizer.')}
            </Text>
            <Button component="a" href="/tournaments" variant="default">
              {t('Tournaments')}
            </Button>
          </Stack>
        </Card>
      </AppLayout>
    );
  }

  if (!tournament) {
    return (
      <AppLayout>
        <Center py={80}>
          <Loader />
        </Center>
      </AppLayout>
    );
  }

  return (
    <AppLayout wide>
      <Head title={tournamentTitle(tournament.name, tournament.grade)} />
      {api.status !== 'joined' && (
        <Alert color="yellow" p="xs" mb="sm">
          {t('Reconnecting…')}
        </Alert>
      )}

      <Stack gap="md">
        <TournamentHeader
          tournament={tournament}
          clock={
            tournament.state === 'active' ? (
              <RoundClock
                embedded
                solves={solves}
                tournament={tournament}
                playerRoundPosition={tournament.type === 'ladder' && isPlayer ? myRound : null}
              >
                {tournament.type === 'ladder' && isPlayer && <LadderNote tournament={tournament} liveMatch={liveMatch} />}
              </RoundClock>
            ) : tournament.state === 'waiting_participants' || tournament.state === 'upcoming' ? (
              <SchedulePreview embedded tournament={tournament} />
            ) : null
          }
          action={<PlayerRow tournament={tournament} api={api} />}
          footer={api.moderator ? <ModeratorControls tournament={tournament} api={api} /> : null}
        />

        <Grid gap="md">
          {/* Standings (with the chat as a tab) and the analysis panels. */}
          <Grid.Col span={{ base: 12, lg: 5, xl: 4 }}>
            <StandingsCard tournament={tournament} api={api} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 7, xl: 8 }}>
            <TournamentPanels tournament={tournament} api={api} />
          </Grid.Col>
        </Grid>
      </Stack>

      <NextMatchModal />
    </AppLayout>
  );
}
