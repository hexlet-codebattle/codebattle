import { Head } from '@inertiajs/react';
import { Badge, Button, Card, Container, Divider, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendar, IconChecklist, IconLogin, IconStack2, IconSwords, IconTrophy, IconUserPlus, IconUsers } from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { DevSignIn, SocialButtons, withNext } from '@/features/auth/AuthForms';
import classes from '@/features/landing/Landing.module.css';
import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { LeagueBanner } from '@/features/lobby/components/LeagueBanner';
import { formatStartsAt, gradeLabel, rankingPoints, taskLevelsLabel, tournamentTitle } from '@/features/lobby/format';
import type { GameLevel, TournamentGrade, TournamentState } from '@/features/lobby/types';
import roomClasses from '@/features/tournament/components/Room.module.css';
import { TournamentStateBadge } from '@/features/tournament/components/TournamentHeader';
import { AppLayout } from '@/layout/AppLayout';
import { LangIcon } from '@/shared/LangIcon';
import { Markdown } from '@/shared/Markdown';
import { MethodButton } from '@/shared/MethodButton';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from TournamentController.show for guests (render_public_tournament/2).
interface PublicTournament {
  id: number;
  name: string;
  description: string | null;
  type: 'swiss' | 'ladder';
  grade: TournamentGrade;
  state: TournamentState;
  break_state: 'on' | 'off';
  show_results: boolean;
  access_type: 'public' | 'token';
  level: GameLevel | null;
  task_provider: string;
  task_pack_name: string | null;
  players_count: number;
  players_limit: number | null;
  rounds_limit: number;
  current_round_position: number;
  starts_at: string | null;
}

interface TopPlayer {
  id: number;
  place: number;
  score: number;
  name: string;
  lang: string | null;
}

interface TournamentPublicProps {
  tournament: PublicTournament;
  top_players: TopPlayer[];
  season: { name: string; year: number } | null;
  next: string;
  dev_sign_in: boolean;
}

const LANGUAGES = ['clojure', 'cpp', 'c-sharp', 'dart', 'elixir', 'go', 'java', 'js', 'kotlin', 'php', 'python', 'ruby', 'rust', 'swift', 'ts', 'dlang', 'zig'];

const isOpenForJoin = (state: TournamentState) => state === 'upcoming' || state === 'waiting_participants';

/** The sign-up card: what an account gets you in this tournament right now. */
function JoinCard({ tournament, next, devSignIn }: { tournament: PublicTournament; next: string; devSignIn: boolean }) {
  const { t } = useTranslation();
  const full = tournament.players_limit != null && tournament.players_count >= tournament.players_limit;

  const [title, text] = (() => {
    if (isOpenForJoin(tournament.state) && !full) return [t('Join this tournament'), t('Create a free account or sign in to take your seat. It takes less than a minute.')];
    if (tournament.state === 'active') return [t('The battles are live'), t('Sign in to watch the games, follow the standings, and get ready for the next tournament.')];
    if (tournament.state === 'finished') return [t('This tournament is over'), t('Sign in to see the full results and join the next tournament.')];
    return [t('Join Codebattle'), t('Sign in to follow this tournament and battle in the next ones.')];
  })();

  return (
    <Card className={classes.leaderboard} padding="lg">
      <Stack gap="sm">
        <Title order={3}>{title}</Title>
        <Text size="sm" c="dimmed">
          {text}
        </Text>
        <Button component="a" href={withNext('/users/new', next)} size="md" color="green" leftSection={<IconUserPlus size={18} />} fullWidth>
          {t('Sign up')}
        </Button>
        <Button component="a" href={withNext('/session/new', next)} size="md" variant="default" leftSection={<IconLogin size={18} />} fullWidth>
          {t('Sign in')}
        </Button>
        <Divider label={t('or')} labelPosition="center" />
        <SocialButtons next={next} label="up" />
        {devSignIn && <DevSignIn />}
      </Stack>
    </Card>
  );
}

function Facts({ tournament }: { tournament: PublicTournament }) {
  const { t } = useTranslation();
  const round = Math.min(tournament.current_round_position + 1, tournament.rounds_limit);

  return (
    <Group gap="lg" c="dimmed" fz="sm">
      <Group gap={6} wrap="nowrap">
        <IconUsers size={16} />
        <Text inherit ff="monospace">
          {tournament.players_count}
          {tournament.players_limit ? ` / ${tournament.players_limit}` : ''}
        </Text>
      </Group>
      <Group gap={6} wrap="nowrap">
        <IconStack2 size={16} />
        <Text inherit>
          {tournament.state === 'active' || tournament.state === 'finished'
            ? t('Round %{round} of %{total}', { round, total: tournament.rounds_limit })
            : t('%{count} rounds', { count: tournament.rounds_limit })}
        </Text>
      </Group>
      {(tournament.task_provider === 'task_pack' && tournament.task_pack_name) || tournament.level ? (
        <Group gap={6} wrap="nowrap">
          <IconChecklist size={16} />
          <Text inherit>{tournament.task_provider === 'task_pack' && tournament.task_pack_name ? tournament.task_pack_name : taskLevelsLabel(tournament.task_provider, tournament.level as GameLevel)}</Text>
        </Group>
      ) : null}
      {isOpenForJoin(tournament.state) && tournament.starts_at && (
        <Group gap={6} wrap="nowrap">
          <IconCalendar size={16} />
          <Text inherit>{formatStartsAt(tournament.starts_at)}</Text>
        </Group>
      )}
    </Group>
  );
}

function TopPlayers({ players, finished }: { players: TopPlayer[]; finished: boolean }) {
  const { t } = useTranslation();

  return (
    <Card>
      <Group gap={6} mb="sm">
        <IconTrophy size={18} />
        <Text fw={700}>{finished ? t('Winners') : t('Leaders right now')}</Text>
      </Group>
      <Stack gap={6}>
        {players.map((player) => (
          <Group key={player.id} gap="sm" wrap="nowrap" className={classes.leaderRow}>
            <span className={classes.place}>{player.place}</span>
            <LangIcon lang={player.lang} />
            <Text fw={700} c="bright" truncate flex={1}>
              {player.name}
            </Text>
            <Text ff="monospace" fw={700}>
              {player.score}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

/** `/tournaments/:id` for guests: the tournament, what Codebattle is, and the way in. */
export default function TournamentPublic() {
  const { t } = useTranslation();
  const { tournament, top_players: topPlayers, season, next, dev_sign_in: devSignIn } = useSharedProps<TournamentPublicProps>();
  const league = tournament.grade !== 'open';
  const points = league ? rankingPoints(tournament.grade) : null;
  const title = tournamentTitle(tournament.name, tournament.grade);

  return (
    <AppLayout wide>
      <Head title={title} />
      <Container size="lg">
        <section className={classes.hero}>
          <div
            className={roomClasses.hero}
            style={{ padding: 'var(--mantine-spacing-xl)', ...(league ? ({ '--grade': `var(--cb-grade-${tournament.grade})` } as CSSProperties) : {}) }}
          >
            <Stack gap="md">
              <Text className={classes.eyebrow}>{league ? t('Codebattle League · %{grade}', { grade: gradeLabel(tournament.grade) }) : t('Tournament')}</Text>
              <Group gap="sm" wrap="nowrap">
                {league ? <GradeIcon grade={tournament.grade} size={40} /> : <IconTrophy size={32} stroke={1.5} />}
                <Title order={1} lh={1.1} style={{ wordBreak: 'break-word' }}>
                  {title}
                </Title>
              </Group>
              <Group gap={6}>
                <TournamentStateBadge tournament={tournament} size="sm" />
                <Badge variant="default" tt="none" size="sm">
                  {tournament.type === 'ladder' ? t('Ladder') : t('Swiss')}
                </Badge>
                {points != null && (
                  <Badge variant="light" tt="none" size="sm" className={roomClasses.gradeBadge}>
                    {t('%{points} points', { points })}
                  </Badge>
                )}
              </Group>
              <Facts tournament={tournament} />
              {tournament.description && <Markdown>{tournament.description}</Markdown>}
              {league && points != null && (
                <Text size="sm" c="dimmed">
                  {season
                    ? t('Counts toward the %{season} season: the winner takes %{points} season points.', { season: `${season.name} ${season.year}`, points })
                    : t('A Codebattle League tournament: the winner takes %{points} season points.', { points })}
                </Text>
              )}
            </Stack>
          </div>

          <JoinCard tournament={tournament} next={next} devSignIn={devSignIn} />
        </section>

        {topPlayers.length > 0 && (
          <section className={classes.section}>
            <TopPlayers players={topPlayers} finished={tournament.state === 'finished'} />
          </section>
        )}

        <section className={classes.section}>
          <LeagueBanner />
        </section>

        <section className={classes.section}>
          <Stack gap={6} align="center" ta="center" mb="lg">
            <Text className={classes.eyebrow}>{t('What is Codebattle')}</Text>
            <Title order={2}>{t('Play in the best coding arena')}</Title>
            <Text c="dimmed" maw={680}>
              {t('Codebattle powers head-to-head battles, team brackets, and seasonal leaderboards. Set formats, invite players, and watch the rankings move in real time.')}
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {[
              [t('Head-to-head battles'), t('You and your opponent get the same task. The first correct solution wins the round.')],
              [t('Swiss tournaments'), t('Face opponents with similar scores, solve the same task, and rise with every win.')],
              [t('Seasons and Elo'), t('Earn season points, climb the live leaderboard, and lock your place in the finale.')],
            ].map(([featureTitle, text], index) => (
              <Card key={featureTitle} className={classes.feature}>
                <ThemeIcon variant="light" color="green" size="lg" radius="md" mb="sm">
                  <Text fw={800} ff="monospace">
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </ThemeIcon>
                <Title order={4} mb={4}>
                  {featureTitle}
                </Title>
                <Text size="sm" c="dimmed">
                  {text}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </section>

        <section className={classes.section}>
          <Stack gap={6} align="center" ta="center" mb="lg">
            <Title order={2}>{t('Battle in your language')}</Title>
          </Stack>
          <div className={classes.languages}>
            {LANGUAGES.map((lang) => (
              <img key={lang} src={`/assets/images/landing/languages/${lang}.svg`} alt={lang} width={64} height={64} loading="lazy" decoding="async" />
            ))}
          </div>
        </section>

        <section className={classes.cta} style={{ marginBottom: 'var(--mantine-spacing-xl)' }}>
          <Title order={2}>{t('Ready to enter the arena?')}</Title>
          <Text c="dimmed">{isOpenForJoin(tournament.state) ? t('Sign up and take your seat before the tournament starts.') : t('Warm up with a quick match against a bot.')}</Text>
          <Group gap="sm" justify="center">
            <Button component="a" href={withNext('/users/new', next)} size="lg" color="green" leftSection={<IconUserPlus size={18} />}>
              {t('Sign up')}
            </Button>
            <MethodButton action="/games/training" method="post" size="lg" variant="default" leftSection={<IconSwords size={18} />}>
              {t('Try simple battle')}
            </MethodButton>
          </Group>
        </section>
      </Container>
    </AppLayout>
  );
}
