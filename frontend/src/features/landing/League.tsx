import { Anchor, Avatar, Badge, Group, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { useDisclosure, useInterval } from '@mantine/hooks';
import { IconBook2, IconChevronRight, IconCrown, IconTrophy } from '@tabler/icons-react';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatCountdown, formatStartsIn, gradeLabel, msUntil, rankingPoints, tournamentTitle } from '@/features/lobby/format';
import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { RulesModal } from '@/features/lobby/components/LeagueBanner';
import type { TournamentGrade } from '@/features/lobby/types';
import { LangIcon } from '@/shared/LangIcon';

import classes from './Landing.module.css';

export interface LeagueTournament {
  id: number;
  name: string;
  grade: TournamentGrade;
  starts_at: string;
}

export interface LeaderboardRow {
  place: number;
  user_id: number;
  user_name: string;
  avatar_url: string | null;
  user_lang: string | null;
  total_points: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** Ticks every second so the next start counts down live. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useInterval(() => setNow(Date.now()), 1000, { autoInvoke: true });
  return now;
}

function StartsIn({ startsAt }: { startsAt: string }) {
  const { t } = useTranslation();
  useNow();
  const left = msUntil(startsAt);

  if (left <= 0) return <>{t('Starting soon')}</>;
  if (left <= DAY) {
    return (
      <Text span ff="monospace" fw={700} c="var(--cb-brand-text)" fz="inherit">
        {t('in %{time}', { time: formatCountdown(left) })}
      </Text>
    );
  }

  return <>{formatStartsIn(left)}</>;
}

function UpcomingTournaments({ tournaments }: { tournaments: LeagueTournament[] }) {
  const { t } = useTranslation();

  return (
    <div className={classes.leaguePanel}>
      <Text className={classes.panelTitle}>{t('Upcoming Tournaments')}</Text>
      {tournaments.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t('League tournaments will appear here soon.')}
        </Text>
      ) : (
        <Stack gap={6}>
          {tournaments.map((tournament) => (
            <a key={tournament.id} href={`/tournaments/${tournament.id}`} className={classes.tournamentRow} style={{ '--grade': `var(--cb-grade-${tournament.grade})` } as CSSProperties}>
              <GradeIcon grade={tournament.grade} size={32} />
              <Stack gap={0} miw={0} flex={1}>
                <Text fw={700} c="bright" truncate>
                  {tournamentTitle(tournament.name, tournament.grade)}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  <StartsIn startsAt={tournament.starts_at} />
                </Text>
              </Stack>
              <Stack gap={0} align="flex-end">
                <Text ff="monospace" fw={800} className={classes.gradePoints}>
                  +{rankingPoints(tournament.grade)}
                </Text>
                <Text fz={10} c="dimmed" tt="uppercase" lts="0.04em">
                  {gradeLabel(tournament.grade)}
                </Text>
              </Stack>
              <IconChevronRight size={16} className={classes.rowChevron} />
            </a>
          ))}
        </Stack>
      )}
    </div>
  );
}

function SeasonTop({ season, leaderboard }: { season: { name: string; year: number } | null; leaderboard: LeaderboardRow[] }) {
  const { t } = useTranslation();

  return (
    <div className={classes.leaguePanel}>
      <Group justify="space-between" mb="sm" gap="xs">
        <Group gap={8} wrap="nowrap" miw={0}>
          <IconTrophy size={16} className={classes.trophy} />
          <Text className={classes.panelTitle} mb={0}>
            {t('Top 5 players • current season')}
          </Text>
        </Group>
        <Badge variant="light">{season ? `${season.name} ${season.year}` : t('Upcoming')}</Badge>
      </Group>
      {leaderboard.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t('Season standings will appear here soon.')}
        </Text>
      ) : (
        <Stack gap={6}>
          {leaderboard.map((row) => (
            <Group key={row.user_id} gap="sm" wrap="nowrap" className={classes.leaderRow} data-place={row.place}>
              <span className={classes.place}>{row.place}</span>
              <Avatar src={row.avatar_url} size={28} />
              <LangIcon lang={row.user_lang} />
              <Text fw={700} c="bright" truncate flex={1}>
                {row.user_name}
              </Text>
              <Text ff="monospace" fw={800} c="bright">
                {row.total_points}{' '}
                <Text span size="xs" c="dimmed" fw={600}>
                  {t('pts')}
                </Text>
              </Text>
            </Group>
          ))}
        </Stack>
      )}
      <Anchor href="/seasons" size="sm" mt="md" display="inline-block">
        {t('Explore seasons and tournaments')} →
      </Anchor>
    </div>
  );
}

/** The seasonal league pitch: what it is, what's starting next, and who leads this season. */
export function League({ tournaments, season, leaderboard }: { tournaments: LeagueTournament[]; season: { name: string; year: number } | null; leaderboard: LeaderboardRow[] }) {
  const { t } = useTranslation();
  const [rulesOpened, rules] = useDisclosure(false);

  return (
    <section className={classes.league} aria-labelledby="landing-league">
      <div className={classes.leagueIntro}>
        <GradeIcon grade="grand_slam" size={56} />
        <Text className={classes.eyebrow}>{t('Codebattle League')}</Text>
        <Title order={2} id="landing-league" className={classes.sectionTitle}>
          {t('Four Grand Slams every season. One champion.')}
        </Title>
        <Text c="dimmed">
          {t('Play season games, earn points, and compete for your place in the Hall of Fame. Each season’s winner takes home exclusive Codebattle merch.')}
        </Text>
        <div className={classes.medals} aria-hidden>
          {(['grand_slam', 'masters', 'elite'] as const).map((grade) => (
            <span key={grade} className={classes.medal} style={{ '--grade': `var(--cb-grade-${grade})` } as CSSProperties}>
              <GradeIcon grade={grade} size={18} />
              {gradeLabel(grade)}
              <b>+{rankingPoints(grade)}</b>
            </span>
          ))}
        </div>
        <Group gap="lg" mt={4}>
          <UnstyledButton onClick={rules.open} className={classes.textLink}>
            <IconBook2 size={16} />
            {t('League rules')}
          </UnstyledButton>
          <a href="/hall_of_fame" className={classes.textLink}>
            <IconCrown size={16} />
            {t('Hall of Fame')}
          </a>
        </Group>
      </div>
      <UpcomingTournaments tournaments={tournaments} />
      <SeasonTop season={season} leaderboard={leaderboard} />
      <RulesModal opened={rulesOpened} onClose={rules.close} />
    </section>
  );
}
