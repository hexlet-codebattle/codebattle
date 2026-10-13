import { ActionIcon, Anchor, Badge, Button, Stack, Text, Tooltip } from '@mantine/core';
import { IconArrowDown, IconBolt, IconClock, IconEye, IconPlayerPlay } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { formatSeconds } from '@/features/tasks/shared';
import { UserCard } from '@/features/users/UserCard';
import { getLocale } from '@/i18n';
import { LangIcon } from '@/shared/LangIcon';

import { useTournamentStore } from '../store';
import type { Match, Player, PlayerResult } from '../types';
import type { TournamentApi } from '../useTournament';
import { useTaskNames } from '../useTaskNames';

import { PanelMessage } from './common';
import classes from './MatchList.module.css';

const time = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false }).format(
        new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`),
      )
    : null;

type Outcome = 'won' | 'lost' | 'draw' | 'live' | 'pending';

function outcomeOf(match: Match, playerId: number): Outcome {
  if (match.state === 'playing') return 'live';
  const result = match.player_results?.[playerId]?.result;
  if (!result || result === 'undefined') return match.state === 'pending' ? 'pending' : 'draw';
  if (match.winner_id === playerId || result === 'won') return 'won';
  if (match.winner_id != null || result === 'lost' || result === 'gave_up') return 'lost';
  return 'draw';
}

function BreakdownLine({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className={classes.breakdownLine}>
      <span>{label}</span>
      <span className={classes.breakdownValue} data-strong={strong || undefined}>
        {value}
      </span>
    </div>
  );
}

/** Ladder: score = base × factor × tests% (legacy UsersMatchList formula), as a caption with a labelled breakdown. */
function Formula({ result, label }: { result: PlayerResult; label: string }) {
  const { t } = useTranslation();
  if (result.base_score == null) return null;

  const kind = result.result === 'timeout' ? 'timeout' : result.result === 'won' ? 'speed' : 'loss';
  const factorName = kind === 'timeout' ? t('Timeout factor') : kind === 'speed' ? t('Speed bonus') : t('Loss factor');
  const factor = (result.score_factor ?? 0).toFixed(2);
  const tests = Math.round(result.result_percent ?? 0);

  return (
    <Tooltip
      withArrow
      multiline
      w={240}
      label={
        <Stack gap={2}>
          <Text size="xs" fw={700}>
            {label}
          </Text>
          <BreakdownLine label={t('Task base score')} value={result.base_score} />
          <BreakdownLine label={factorName} value={`× ${factor}`} />
          <BreakdownLine label={t('Tests passed')} value={`× ${tests}%`} />
          <BreakdownLine label={t('Total')} value={result.score ?? 0} strong />
        </Stack>
      }
    >
      <span className={classes.factorChip} data-kind={kind}>
        {kind === 'speed' ? <IconBolt size={11} /> : kind === 'timeout' ? <IconClock size={11} /> : <IconArrowDown size={11} />}×{factor}
      </span>
    </Tooltip>
  );
}

interface SideProps {
  id: number;
  match: Match;
  players: Record<number, Player>;
  /** "me" sits left of the score (aligned toward it), the opponent right of it. */
  side: 'me' | 'opponent';
  winner: boolean;
  showFormula: boolean;
  formulaLabel: string;
}

/** One player of a match: name, then tests passed (and the ladder score maths). */
function Side({ id, match, players, side, winner, showFormula, formulaLabel }: SideProps) {
  const result = match.player_results?.[id];
  const player = players[id];
  const name = player?.name ?? `#${id}`;
  const tests = result?.result_percent;

  return (
    <div className={classes.side} data-side={side} data-winner={winner || undefined}>
      <span className={classes.who}>
        <LangIcon lang={result?.lang ?? player?.lang} />
        <UserCard user={{ id, name, is_bot: player?.is_bot }}>
          <Text span size="sm" fw={winner ? 800 : 600} c={winner ? 'bright' : undefined} truncate>
            {name}
          </Text>
        </UserCard>
        {side === 'opponent' && player && !player.is_bot && (player.place > 0 || player.rating != null) && (
          <span className={classes.context}>
            {[player.place > 0 ? `#${player.place}` : null, player.rating != null ? `${player.rating}` : null].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
      <span className={classes.sub}>
        {tests != null && (
          <span className={classes.testsValue} data-full={tests >= 100 || undefined}>
            {Math.round(tests)}%
          </span>
        )}
        {showFormula && result && <Formula result={result} label={formulaLabel} />}
      </span>
    </div>
  );
}

/** The round's task: level badge and name (linking to the task). */
function TaskCell({ match, task }: { match: Match; task: { name: string; level: string } | 'loading' | undefined }) {
  const { t } = useTranslation();
  const level = (task && task !== 'loading' ? task.level : match.level) as GameLevel | null;

  return (
    <div className={classes.task}>
      {level && (
        <Badge size="xs" variant="light" color={LEVEL_COLORS[level] ?? 'gray'} className={classes.levelBadge}>
          {levelLabel(level)}
        </Badge>
      )}
      {match.task_id != null ? (
        <Anchor href={`/tasks/${match.task_id}`} target="_blank" size="xs" c="dimmed" truncate className={classes.taskName}>
          {task && task !== 'loading' ? task.name : t('Task #%{id}', { id: match.task_id })}
        </Anchor>
      ) : null}
    </div>
  );
}

interface MatchCardsProps {
  api: TournamentApi;
  matches: Match[];
  /** Whose matches these are: shown on the left, and "Continue" when the game is live. */
  playerId: number;
  /** Ladder tournaments explain each score. */
  showScoreFormula?: boolean;
  emptyText?: string;
}

/**
 * Matches, newest round first, as scoreboard rows: the player on the left, the score in
 * a fixed centre column (colons line up), the opponent mirrored on the right, then the
 * timing and the game link (legacy UsersMatchList).
 */
export function MatchCards({ api, matches, playerId, showScoreFormula = false, emptyText }: MatchCardsProps) {
  const { t } = useTranslation();
  const players = useTournamentStore((state) => state.players);
  const sorted = useMemo(() => [...matches].sort((a, b) => b.round_position - a.round_position || b.id - a.id), [matches]);
  const tasks = useTaskNames(
    api,
    sorted.map((match) => match.task_id),
  );

  if (sorted.length === 0) return <PanelMessage>{emptyText ?? t('No matches yet')}</PanelMessage>;

  const outcomeLabel: Record<Outcome, string> = {
    won: t('Won'),
    lost: t('Lost'),
    draw: t('No winner'),
    live: t('Playing'),
    pending: t('Pending'),
  };
  const outcomeChip: Record<Outcome, string> = { won: 'W', lost: 'L', draw: '–', live: '●', pending: '…' };

  return (
    <div className={classes.list}>
      {sorted.map((match) => {
        const opponent = match.player_ids.find((id) => id !== playerId);
        const outcome = outcomeOf(match, playerId);
        const mine = match.player_results?.[playerId];
        const theirs = opponent != null ? match.player_results?.[opponent] : undefined;
        const started = time(match.started_at);
        const finished = time(match.finished_at);
        const live = outcome === 'live' && match.player_ids.includes(playerId);

        return (
          <div key={match.id} className={classes.row} data-outcome={outcome}>
            <div className={classes.badge}>
              <Tooltip label={outcomeLabel[outcome]} openDelay={300}>
                <span className={classes.chip} data-outcome={outcome}>
                  {outcomeChip[outcome]}
                </span>
              </Tooltip>
              <span className={classes.round}>R{match.round_position + 1}</span>
            </div>

            <TaskCell match={match} task={match.task_id != null ? tasks[match.task_id] : undefined} />

            <Side
              id={playerId}
              match={match}
              players={players}
              side="me"
              winner={match.winner_id === playerId}
              showFormula={showScoreFormula}
              formulaLabel={t('You')}
            />

            <div className={classes.score}>
              {outcome === 'live' ? (
                <span className={classes.livePill}>{t('LIVE')}</span>
              ) : mine?.score != null || theirs?.score != null ? (
                <Tooltip label={t("Your points : opponent's points")} openDelay={300}>
                  <span className={classes.scoreboard}>
                    <span className={classes.mine} data-win={outcome === 'won' || undefined}>
                      {mine?.score ?? 0}
                    </span>
                    <span className={classes.colon}>:</span>
                    <span className={classes.theirs} data-win={outcome === 'lost' || undefined}>
                      {theirs?.score ?? 0}
                    </span>
                  </span>
                </Tooltip>
              ) : (
                <span className={classes.colon}>vs</span>
              )}
            </div>

            {opponent != null ? (
              <Side
                id={opponent}
                match={match}
                players={players}
                side="opponent"
                winner={match.winner_id === opponent}
                showFormula={showScoreFormula}
                formulaLabel={t('Opponent')}
              />
            ) : (
              <span className={classes.side} data-side="opponent">
                —
              </span>
            )}

            <div className={classes.meta}>
              <span className={classes.duration}>
                <IconClock size={12} />
                {match.duration_sec != null ? formatSeconds(match.duration_sec) : outcome === 'live' ? t('in progress') : '—'}
              </span>
              {started && (
                <span className={classes.time}>
                  {started}
                  {finished ? `–${finished}` : ''}
                </span>
              )}
            </div>

            <div className={classes.action}>
              {live ? (
                <Button component="a" href={`/games/${match.game_id}`} size="compact-sm" color="green" leftSection={<IconPlayerPlay size={13} />}>
                  {t('Continue')}
                </Button>
              ) : (
                <Tooltip label={t('Watch')} openDelay={300}>
                  <ActionIcon component="a" href={`/games/${match.game_id}`} size="md" variant="subtle" color="gray" aria-label={t('Watch')}>
                    <IconEye size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
