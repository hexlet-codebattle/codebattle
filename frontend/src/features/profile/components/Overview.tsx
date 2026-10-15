import { Anchor, Card, Group, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { gradeLabel } from '@/features/lobby/format';
import { UserCard } from '@/features/users/UserCard';
import { GRADE_WINS } from '@/features/users/achievements';
import { LangIcon, langName } from '@/shared/LangIcon';

import { fetchRivals, type ProfileStats } from '../api';

import classes from './Profile.module.css';

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Stack gap={0} align="center" className={classes.stat}>
      <Text ff="monospace" fz={26} fw={800} c="bright" lh={1.2}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {hint && (
        <Text fz={11} c="dimmed">
          {hint}
        </Text>
      )}
    </Stack>
  );
}

interface Bar {
  key: string;
  label: ReactNode;
  value: number;
  color: string;
}

/** Horizontal bars scaled to the largest value; light enough to skip a chart library. */
function BarList({ bars }: { bars: Bar[] }) {
  const max = Math.max(1, ...bars.map(({ value }) => value));

  return (
    <Stack gap={8}>
      {bars.map((bar) => (
        <div key={bar.key} className={classes.barRow}>
          <div className={classes.barLabel}>{bar.label}</div>
          <div className={classes.barTrack}>
            <div className={classes.barFill} style={{ width: `${(bar.value / max) * 100}%`, background: bar.color }} />
          </div>
          <Text size="sm" ff="monospace" fw={700} c="bright" ta="right">
            {bar.value}
          </Text>
        </div>
      ))}
    </Stack>
  );
}

export function StatsCard({ profile }: { profile: ProfileStats }) {
  const { t } = useTranslation();
  const { user, metrics } = profile;
  const games = metrics.game_stats;
  const total = games.won + games.lost + games.gave_up;
  const winRate = total ? Math.round((games.won / total) * 100) : null;

  return (
    <Card>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={0} className={classes.stats}>
        <Stat label={t('Elo')} value={user.rating ?? '—'} />
        {!user.is_bot && <Stat label={t('Place')} value={user.points ? `#${user.rank}` : '—'} />}
        <Stat label={t('Points')} value={user.points ?? 0} />
        <Stat label={t('Games')} value={total} hint={winRate != null ? t('%{percent}% won', { percent: winRate }) : undefined} />
      </SimpleGrid>
    </Card>
  );
}

export function ResultsCard({ profile }: { profile: ProfileStats }) {
  const { t } = useTranslation();
  const { game_stats: games, tournaments_stats: tournaments } = profile.metrics;
  const totalGames = games.won + games.lost + games.gave_up;
  const tournamentWins = GRADE_WINS.reduce((sum, { key }) => sum + (tournaments[key] ?? 0), 0);

  if (totalGames === 0 && tournamentWins === 0) return null;

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      <Card>
        <Group justify="space-between" mb="sm">
          <Title order={5}>{t('Games')}</Title>
          <Text size="xs" c="dimmed">
            {t('Total games: %{count}', { count: totalGames })}
          </Text>
        </Group>
        <BarList
          bars={[
            { key: 'won', label: t('Won'), value: games.won, color: 'var(--cb-success)' },
            { key: 'lost', label: t('Lost'), value: games.lost, color: 'var(--cb-danger)' },
            { key: 'gave_up', label: t('Gave up'), value: games.gave_up, color: 'var(--cb-text-muted)' },
          ]}
        />
      </Card>
      <Card>
        <Group justify="space-between" mb="sm">
          <Title order={5}>{t('Tournament wins')}</Title>
          <Text size="xs" c="dimmed">
            {t('Total tournament wins: %{count}', { count: tournamentWins })}
          </Text>
        </Group>
        <BarList
          bars={GRADE_WINS.map(({ grade, key }) => ({
            key,
            label: (
              <Group gap={6} wrap="nowrap">
                <GradeIcon grade={grade} size={18} />
                <Text size="sm" truncate>
                  {gradeLabel(grade)}
                </Text>
              </Group>
            ),
            value: tournaments[key] ?? 0,
            color: `var(--cb-grade-${grade})`,
          }))}
        />
      </Card>
    </SimpleGrid>
  );
}

/** Most-played opponents, plus the languages this player has won with. */
export function RivalsAndLanguages({ profile, userId }: { profile: ProfileStats; userId: string }) {
  const { t } = useTranslation();
  const { data: rivals = [], isPending } = useQuery({ queryKey: ['rivals', userId], queryFn: () => fetchRivals(userId) });
  const languages = Object.entries(profile.metrics.language_stats ?? {})
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  if (!isPending && rivals.length === 0 && languages.length === 0) return null;

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      <Card>
        <Title order={5} mb="sm">
          {t('Rivals')}
        </Title>
        {isPending ? (
          <Stack gap={6}>
            <Skeleton h={32} />
            <Skeleton h={32} />
          </Stack>
        ) : rivals.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('No rivals yet.')}
          </Text>
        ) : (
          <Stack gap={4}>
            {rivals.map((rival) => (
              <Group key={rival.id} justify="space-between" wrap="nowrap" className={classes.rival}>
                <Stack gap={0} miw={0}>
                  <UserCard user={rival}>
                    <Text span size="sm" fw={600} c="bright" truncate display="block">
                      {rival.name}
                    </Text>
                  </UserCard>
                  <Text size="xs" c="dimmed" truncate>
                    {rival.clan || '—'}
                  </Text>
                </Stack>
                <Text size="xs" ff="monospace" ta="right" className={classes.record}>
                  <span className={classes.won}>{rival.wins_count}</span> /{' '}
                  <span className={classes.lost}>{rival.losses_count}</span> / {rival.timeouts_count}
                </Text>
              </Group>
            ))}
            <Text fz={11} c="dimmed" ta="right">
              {t('W/L/T')}
            </Text>
          </Stack>
        )}
      </Card>
      <Card>
        <Title order={5} mb="sm">
          {t('Languages')}
        </Title>
        {languages.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('No wins yet.')}
          </Text>
        ) : (
          <Group gap={6}>
            {languages.map(([lang, count]) => (
              <span key={lang} className={classes.langChip}>
                <LangIcon lang={lang} withTooltip={false} />
                {langName(lang)}
                <Text span size="xs" ff="monospace" fw={700}>
                  {count}
                </Text>
              </span>
            ))}
          </Group>
        )}
        <Anchor href="/hall_of_fame" size="xs" mt="sm" display="block" c="dimmed">
          {t('Hall of Fame')} ›
        </Anchor>
      </Card>
    </SimpleGrid>
  );
}
