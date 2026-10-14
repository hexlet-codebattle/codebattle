import { ActionIcon, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconArrowsLeftRight, IconChartLine, IconStar, IconTrophy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import classes from './HeadToHead.module.css';
import type { H2HPlayer, HeadToHeadData } from './types';

function PlayerSide({ player, leading, align }: { player: H2HPlayer; leading: boolean; align: 'start' | 'end' }) {
  const { t } = useTranslation();

  return (
    <div className={classes.side} data-align={align}>
      <a href={`/users/${player.id}`} className={classes.avatarRing} data-leading={leading || undefined} aria-label={player.name}>
        <UserAvatar user={player} size={56} radius="xl" />
      </a>
      <div className={classes.sideBody}>
        <span className={classes.role} data-leading={leading || undefined}>
          {leading ? t('Leading') : t('Contender')}
        </span>
        <Group gap={6} wrap="nowrap" miw={0} justify={align === 'end' ? 'flex-end' : undefined}>
          <LangIcon lang={player.lang} size={18} />
          <UserCard user={player}>
            <Text span fz="lg" fw={700} c="bright" truncate>
              {player.name}
            </Text>
          </UserCard>
        </Group>
        <div className={classes.meta}>
          {player.rank != null && (
            <Tooltip label={t('Rank')}>
              <span>
                <IconTrophy size={12} />#{player.rank}
              </span>
            </Tooltip>
          )}
          {player.rating != null && (
            <Tooltip label={t('Rating')}>
              <span>
                <IconChartLine size={12} />
                {player.rating}
              </span>
            </Tooltip>
          )}
          {player.points != null && (
            <Tooltip label={t('Points')}>
              <span>
                <IconStar size={12} />
                {player.points}
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={classes.stat}>
      {label}
      <b>{value}</b>
    </div>
  );
}

/** Both players, the wins score between them and the shared totals. */
export function DuelHero({ data }: { data: HeadToHeadData }) {
  const { t } = useTranslation();
  const [first, second] = data.players;
  const firstWins = Number(first.wins) || 0;
  const secondWins = Number(second.wins) || 0;
  const draws = Number(data.draws) || 0;
  const decided = firstWins + secondWins + draws;
  const isLeading = (player: H2HPlayer) => data.winner_id === player.id;

  return (
    <div className={classes.hero}>
      <Stack gap="sm">
        <Group justify="center" gap={6}>
          <span className={classes.kicker}>{t('H2H Arena')}</span>
          <Tooltip label={t('Swap sides')}>
            <ActionIcon component="a" href={`/h2h/${second.id}/${first.id}`} variant="subtle" color="gray" size="sm" aria-label={t('Swap sides')}>
              <IconArrowsLeftRight size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <div className={classes.duel}>
          <PlayerSide player={first} leading={isLeading(first)} align="start" />
          <Tooltip label={t('Wins')}>
            <div className={classes.score}>
              <span data-side data-leading={isLeading(first) || undefined}>
                {firstWins}
              </span>
              <span className={classes.scoreSep}>:</span>
              <span data-side data-leading={isLeading(second) || undefined}>
                {secondWins}
              </span>
            </div>
          </Tooltip>
          <PlayerSide player={second} leading={isLeading(second)} align="end" />
        </div>

        {decided > 0 && (
          <div className={classes.shareBar} role="img" aria-label={`${firstWins} : ${draws} : ${secondWins}`}>
            {firstWins > 0 && <span style={{ flexGrow: firstWins }} data-leading={isLeading(first) || undefined} />}
            {draws > 0 && <span style={{ flexGrow: draws }} data-kind="draw" />}
            {secondWins > 0 && <span style={{ flexGrow: secondWins }} data-leading={isLeading(second) || undefined} />}
          </div>
        )}

        <div className={classes.stats}>
          <Stat label={t('Total games')} value={Number(data.total_games) || 0} />
          <Stat label={t('Completed')} value={Number(data.completed_games) || 0} />
          <Stat label={t('Draws')} value={draws} />
        </div>
      </Stack>
    </div>
  );
}
