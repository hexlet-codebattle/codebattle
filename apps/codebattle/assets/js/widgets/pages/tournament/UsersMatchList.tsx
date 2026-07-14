import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import moment from 'moment';
import Tooltip from 'react-bootstrap/Tooltip';
import { useSelector } from 'react-redux';

import OverlayTrigger from '@/components/OverlayTriggerCompat';
import useMatchesStatistics from '@/utils/useMatchesStatistics';

import { type UserNameUser } from '@/components/UserName';

import { type RootState } from '@/slices/store';

import Loading from '../../components/Loading';
import UserInfo from '../../components/UserInfo';
import MatchStatesCodes from '../../config/matchStates';

import MatchAction from './MatchAction';
import TournamentMatchBadge from './TournamentMatchBadge';

interface MatchPlayerResult {
  baseScore?: number;
  result: string;
  resultPercent: number;
  score: number;
  scoreFactor?: number;
  [key: string]: unknown;
}

interface Match {
  id: number;
  gameId: number;
  state: string;
  winnerId: number;
  playerIds: number[];
  playerResults: Record<number, MatchPlayerResult>;
  roundPosition?: number;
  durationSec?: number;
  startedAt?: string;
  finishedAt?: string;
  [key: string]: unknown;
}

export const toLocalTime = (time: string) => moment.utc(time).local().format('HH:mm:ss');

const matchClassName = 'cb-tournament-match';
const matchBodyClassName = 'cb-tournament-match-body';
const matchSummaryClassName = 'cb-tournament-match-summary';
const matchHeaderClassName = 'cb-tournament-match-header';
const matchPlayersClassName = 'cb-tournament-match-players';
const playerSlotClassName = cn('d-flex align-items-center text-nowrap');
const matchMetaClassName = 'cb-tournament-match-meta';
const metaItemClassName = 'cb-tournament-match-meta-item';
const metaIconClassName = 'cb-tournament-match-meta-icon';
const actionClassName = 'cb-tournament-match-action';
const roundBadgeClassName = 'cb-tournament-match-round';
const resultBadgeWrapClassName = 'cb-tournament-match-result';

const getMatchOutcomeModifier = (matchState: string, isWinner: boolean) => {
  switch (matchState) {
    case MatchStatesCodes.playing:
      return 'cb-tournament-match--playing';
    case MatchStatesCodes.pending:
      return 'cb-tournament-match--pending';
    case MatchStatesCodes.gameOver:
      return isWinner ? 'cb-tournament-match--won' : 'cb-tournament-match--lost';
    default:
      return 'cb-tournament-match--neutral';
  }
};

const formatPercent = (value: unknown) =>
  Number(value || 0).toFixed(Number(value || 0) % 1 ? 1 : 0);

const formatScoreFactor = (value: number) => {
  const formatted = value.toFixed(4).replace(/0+$/, '');
  const decimalPlaces = formatted.split('.')[1]?.length ?? 0;

  return decimalPlaces >= 2 ? formatted : value.toFixed(2);
};

const getScoreFactor = (match: Match, result: MatchPlayerResult) => {
  const factor = Number.isFinite(result.scoreFactor)
    ? formatScoreFactor(result.scoreFactor as number)
    : undefined;

  if (match.state === 'timeout') {
    return { label: i18next.t('Timeout factor'), value: factor ?? '0.50' };
  }

  if (result.result === 'won') {
    return { label: i18next.t('Speed bonus'), value: factor ?? '1.00–2.00' };
  }

  return { label: i18next.t('Loss factor'), value: factor ?? '0.75' };
};

interface ScoreTermProps {
  label: string;
  tone: 'base' | 'factor' | 'tests';
  value: string;
}

function ScoreTerm({ label, tone, value }: ScoreTermProps) {
  return (
    <span className={`cb-score-term cb-score-term-${tone}`}>
      <span className="cb-score-term-label">{label}</span>
      <span className="cb-score-term-value">{value}</span>
    </span>
  );
}

interface ScoreFormulaProps {
  label: string;
  match: Match;
  result: MatchPlayerResult | undefined;
}

function ScoreFormula({ label, match, result }: ScoreFormulaProps) {
  if (!result) return null;

  const hasScore = Number.isFinite(result.score);
  const baseScore = Number.isFinite(result.baseScore) ? String(result.baseScore) : '—';
  const factor = getScoreFactor(match, result);

  return (
    <div
      className={cn('cb-score-formula-row', {
        'cb-score-formula-row--winner': result.result === 'won',
      })}
    >
      <span className="cb-score-player-label">{label}</span>
      <span className="cb-score-total">
        <strong>{hasScore ? result.score : '—'}</strong>
        <span>{i18next.t('pts')}</span>
      </span>
      <span className="cb-score-equals" aria-hidden="true">
        =
      </span>
      <div className="cb-score-equation">
        <ScoreTerm label={i18next.t('Base')} tone="base" value={baseScore} />
        <span className="cb-score-operator" aria-hidden="true">
          ×
        </span>
        <ScoreTerm label={factor.label} tone="factor" value={factor.value} />
        <span className="cb-score-operator" aria-hidden="true">
          ×
        </span>
        <ScoreTerm
          label={i18next.t('Tests')}
          tone="tests"
          value={`${formatPercent(result.resultPercent)}%`}
        />
      </div>
    </div>
  );
}

interface MatchScoreBreakdownProps {
  match: Match;
  playerId: number;
  opponentId: number;
}

function MatchScoreBreakdown({ match, playerId, opponentId }: MatchScoreBreakdownProps) {
  const playerResult = match.playerResults[playerId];
  const opponentResult = match.playerResults[opponentId];

  if (!playerResult || !Number.isFinite(playerResult.score)) return null;

  return (
    <div className="cb-score-breakdown">
      <ScoreFormula label={i18next.t('You')} match={match} result={playerResult} />
      <ScoreFormula label={i18next.t('Opponent')} match={match} result={opponentResult} />
    </div>
  );
}

const orderMatchPlayerIds = (playerIds: number[], playerId: number) => {
  if (!playerIds.includes(playerId)) {
    return playerIds;
  }

  return [playerId, ...playerIds.filter((id) => id !== playerId)];
};

interface UserTournamentInfoProps {
  userId: number;
}

function UserTournamentInfo({ userId }: UserTournamentInfoProps) {
  const user = useSelector(
    (state: RootState) =>
      (state.tournament.players as Record<number, Record<string, unknown>>)[userId] as unknown as
        | UserNameUser
        | undefined,
  );

  if (!user) {
    return <Loading adaptive />;
  }

  return <UserInfo user={user} hideOnlineIndicator hideLink />;
}

function MatchPlayer({ userId }: UserTournamentInfoProps) {
  return (
    <div className={playerSlotClassName}>
      <UserTournamentInfo userId={userId} />
    </div>
  );
}

interface UsersMatchListProps {
  currentUserId: number;
  playerId: number;
  canModerate: boolean;
  matches: Match[];
  hideStats?: boolean;
  hideBots?: boolean;
  showScoreFormula?: boolean;
}

function UsersMatchList({
  currentUserId,
  playerId,
  canModerate,
  matches,
  hideStats = false,
  hideBots = false,
  showScoreFormula = false,
}: UsersMatchListProps) {
  const [player] = useMatchesStatistics(
    playerId,
    matches as unknown as Parameters<typeof useMatchesStatistics>[1],
  );

  if (matches.length === 0) {
    return (
      <div className="d-flex flex-colum justify-content-center align-items-center p-2">
        No Matches Yet
      </div>
    );
  }

  return (
    <div className="d-flex flex-column">
      {!hideStats && matches.length > 0 && (
        <div className="d-flex py-2 border-bottom cb-border-color align-items-center overflow-auto">
          <span className="ml-2">
            {'Wins: '}
            {player.winMatches.length}
          </span>
          <span className="ml-1 pl-1 border-left cb-border-color">
            {'AVG Tests: '}
            {Math.ceil(player.avgTests)}%
          </span>
          <span className="ml-1 pl-1 border-left cb-border-color">
            {'AVG Duration: '}
            {Math.ceil(player.avgDuration)}
            {' sec'}
          </span>
        </div>
      )}
      {matches.map((match) => {
        const currentUserIsPlayer =
          currentUserId === match.playerIds[0] || currentUserId === match.playerIds[1];
        const isWinner = playerId === match.winnerId;
        const visiblePlayerIds = hideBots
          ? match.playerIds.filter((id) => id >= 0)
          : match.playerIds;
        const matchPlayerIds = orderMatchPlayerIds(visiblePlayerIds, playerId);
        const matchResult = match.playerResults[playerId];

        return (
          <div
            key={match.id}
            className={cn(matchClassName, getMatchOutcomeModifier(match.state, isWinner))}
          >
            <div className={matchBodyClassName}>
              <div className={matchSummaryClassName}>
                <div className={matchHeaderClassName}>
                  <span className={roundBadgeClassName}>
                    {`R${(match.roundPosition ?? 0) + 1}`}
                  </span>
                  <span className={resultBadgeWrapClassName}>
                    <TournamentMatchBadge
                      matchState={match.state}
                      isWinner={isWinner}
                      currentUserIsPlayer={currentUserIsPlayer}
                    />
                  </span>
                </div>
                <div className={matchPlayersClassName}>
                  {matchPlayerIds.length >= 1 && <MatchPlayer userId={matchPlayerIds[0]} />}
                  {matchPlayerIds.length >= 2 && (
                    <>
                      <span className="cb-tournament-match-vs">VS</span>
                      <MatchPlayer userId={matchPlayerIds[1]} />
                    </>
                  )}
                </div>
                {matchResult && matchResult.result !== 'undefined' && (
                  <div className={matchMetaClassName}>
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id={`tests-${match.id}`}>{i18next.t('Tests percent')}</Tooltip>
                      }
                    >
                      <span className={metaItemClassName}>
                        <span className={metaIconClassName}>
                          <FontAwesomeIcon className="text-success" icon="tasks" />
                        </span>
                        {matchResult.resultPercent}
                      </span>
                    </OverlayTrigger>
                    {Number.isFinite(match.durationSec) && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip id={`duration-${match.id}`}>
                            {i18next.t('Duration (sec)')}
                          </Tooltip>
                        }
                      >
                        <span className={metaItemClassName}>
                          <span className={metaIconClassName}>
                            <FontAwesomeIcon className="text-primary" icon="stopwatch" />
                          </span>
                          {match.durationSec}
                        </span>
                      </OverlayTrigger>
                    )}
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id={`time-${match.id}`}>{i18next.t('Started - Finished')}</Tooltip>
                      }
                    >
                      <span className={metaItemClassName}>
                        <span className={metaIconClassName}>
                          <FontAwesomeIcon className="text-primary" icon="flag-checkered" />
                        </span>
                        {match.startedAt ? toLocalTime(match.startedAt) : '-'}
                        <span className="mx-1">-</span>
                        {match.finishedAt ? toLocalTime(match.finishedAt) : '-'}
                      </span>
                    </OverlayTrigger>
                  </div>
                )}
              </div>
              {showScoreFormula && (
                <MatchScoreBreakdown
                  match={match}
                  playerId={playerId}
                  opponentId={matchPlayerIds[1]}
                />
              )}
            </div>
            <div className={actionClassName}>
              <MatchAction match={match} currentUserIsPlayer={currentUserIsPlayer} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(UsersMatchList);
