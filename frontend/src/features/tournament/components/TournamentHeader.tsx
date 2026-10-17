import { Badge, Group, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconCalendar, IconChecklist, IconLock, IconStack2, IconTrophy, IconUsers } from '@tabler/icons-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { formatDate, formatTime, gradeLabel, levelLabel, rankingPoints, tournamentTitle } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';

import type { Tournament } from '../types';

import classes from './Room.module.css';

export function TournamentStateBadge({
  tournament,
  size = 'md',
}: {
  tournament: Pick<Tournament, 'state' | 'break_state' | 'show_results'>;
  size?: 'xs' | 'sm' | 'md';
}) {
  const { t } = useTranslation();
  const [color, label] = (() => {
    switch (tournament.state) {
      case 'active':
        return tournament.break_state === 'on' ? ['yellow', t('Round break')] : ['green', t('Live')];
      case 'waiting_participants':
        return ['blue', t('Waiting for players')];
      case 'upcoming':
        return ['gray', t('Upcoming')];
      case 'finished':
        return tournament.show_results ? ['gray', t('Finished')] : ['yellow', t('Results coming soon')];
      case 'canceled':
        return ['red', t('Canceled')];
      default:
        return ['gray', tournament.state];
    }
  })();

  return (
    <Badge variant="light" color={color} size={size}>
      {label}
    </Badge>
  );
}

interface TournamentHeaderProps {
  tournament: Tournament;
  /** The viewer's action (join / leave / open game) with its status line, on the right. */
  action?: ReactNode;
  /** The round clock / schedule, filling the space between identity and action. */
  clock?: ReactNode;
  /** Moderator toolbar, as the card's footer. */
  footer?: ReactNode;
}

/** The tournament's hero: identity and facts on the left, the viewer's action on the right. */
export function TournamentHeader({ tournament, action, clock, footer }: TournamentHeaderProps) {
  const { t } = useTranslation();
  const league = tournament.grade && tournament.grade !== 'open';
  const round = Math.min(tournament.current_round_position + 1, tournament.rounds_limit);
  const points = league ? rankingPoints(tournament.grade) : null;

  return (
    <div className={classes.hero} style={league ? ({ '--grade': `var(--cb-grade-${tournament.grade})` } as CSSProperties) : undefined}>
      <div className={classes.heroMain}>
        {/* Narrow vertical stack: title with a small trophy, badges, then one fact per line. */}
        <Stack gap={6} miw={0} className={classes.heroIdentity}>
          <Group gap={8} wrap="nowrap" miw={0}>
            <div className={classes.heroIcon}>
              {league ? <GradeIcon grade={tournament.grade} size={26} /> : <IconTrophy size={20} stroke={1.5} />}
            </div>
            <Title order={4} lh={1.15} style={{ wordBreak: 'break-word' }}>
              {tournamentTitle(tournament.name, tournament.grade)}
            </Title>
            {tournament.access_type === 'token' && (
              <Tooltip label={t('Private: joins by invite link')}>
                <IconLock size={16} style={{ flex: 'none' }} />
              </Tooltip>
            )}
          </Group>
          <Group gap={4}>
            <TournamentStateBadge tournament={tournament} size="xs" />
            <Badge variant="default" tt="none" size="xs">
              {tournament.type === 'ladder' ? t('Ladder') : t('Swiss')}
            </Badge>
            {points != null && (
              <Tooltip label={t('Codebattle League · %{grade}', { grade: gradeLabel(tournament.grade) })}>
                <Badge variant="light" tt="none" size="xs" className={classes.gradeBadge}>
                  {t('%{points} points', { points })}
                </Badge>
              </Tooltip>
            )}
          </Group>
          <div className={classes.heroFacts}>
            <Group gap={6} wrap="nowrap">
              <IconUsers size={14} />
              <Text inherit ff="monospace">
                {tournament.players_count}
                {tournament.players_limit ? ` / ${tournament.players_limit}` : ''}
              </Text>
            </Group>
            <Group gap={6} wrap="nowrap">
              <IconStack2 size={14} />
              <Text inherit>
                {tournament.state === 'active' || tournament.state === 'finished'
                  ? t('Round %{round} of %{total}', { round, total: tournament.rounds_limit })
                  : t('%{count} rounds', { count: tournament.rounds_limit })}
              </Text>
            </Group>
            {(tournament.task_pack_name && tournament.task_provider === 'task_pack') || tournament.level ? (
              <Group gap={6} wrap="nowrap">
                <IconChecklist size={14} />
                <Text inherit truncate>
                  {tournament.task_provider === 'task_pack' && tournament.task_pack_name
                    ? tournament.task_pack_name
                    : levelLabel(tournament.level as GameLevel)}
                </Text>
              </Group>
            ) : null}
            {(tournament.state === 'waiting_participants' || tournament.state === 'upcoming') && tournament.starts_at && (
              <Group gap={6} wrap="nowrap">
                <IconCalendar size={14} />
                <Text inherit>{`${formatDate(tournament.starts_at)}, ${formatTime(tournament.starts_at)}`}</Text>
              </Group>
            )}
          </div>
        </Stack>
        {clock && <div className={classes.heroClock}>{clock}</div>}
        {action && <div className={classes.heroAction}>{action}</div>}
      </div>
      {footer && <div className={classes.heroFooter}>{footer}</div>}
    </div>
  );
}
