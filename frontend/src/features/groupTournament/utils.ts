import { t } from '@/i18n';
import { parseServerDate } from '@/shared/date';

import type { GroupTournament, LeaderboardEntry, Run, Solution } from './types';

// Ports of the legacy utils/groupTournament.ts and lib/groupBattle.ts.

/** Round 1 of a ranked tournament with a seed round is "Seed"; the rest count from 1. */
export const roundLabel = (roundPosition: number) => (roundPosition === 1 ? t('Seed') : t('Round %{n}', { n: roundPosition - 1 }));

export const isSeedRun = (run: Pick<Run, 'kind'> | null | undefined) => run?.kind === 'seed';
export const isSliceRun = (run: Pick<Run, 'kind'> | null | undefined) => run?.kind === 'slice';
export const isRoundRun = (run: Pick<Run, 'kind'> | null | undefined) => isSeedRun(run) || isSliceRun(run);

/** The player's place in the round a seed/slice run belongs to, from the leaderboard. */
export function placeFor(run: Run, entry: LeaderboardEntry | null | undefined) {
  if (!entry?.rounds) return null;
  const key = isSeedRun(run) ? 1 : run.round_position;
  if (key == null) return null;
  const place = entry.rounds[String(key)]?.place;
  return Number.isInteger(place) ? (place as number) : null;
}

/** "Qualification run", "Group run 2", or "Test run v3" (test runs numbered oldest first). */
export function runTitle(run: Run, runs: Run[]) {
  if (isSeedRun(run)) return t('Qualification run');
  if (isSliceRun(run)) {
    const round = run.round_position != null ? run.round_position - 1 : null;
    return round ? `${t('Group run')} ${round}` : t('Group run');
  }

  const testRuns = runs.filter((item) => !isRoundRun(item));
  const index = testRuns.findIndex((item) => item.id === run.id);
  return index === -1 ? t('Test run') : `${t('Test run')} v${testRuns.length - index}`;
}

const timestamp = (value: string | null | undefined) => {
  if (!value) return null;
  const ms = parseServerDate(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

/** The solution a run executed: same id, else the latest one submitted before the run. Newest-first history. */
export function solutionForRun(run: Run | null | undefined, history: Solution[]): Solution | null {
  if (!run) return null;
  if (run.solution) return run.solution;
  if (!history.length) return null;

  const sameId = history.find((solution) => solution.id === run.id);
  if (sameId) return sameId;

  const runAt = timestamp(run.inserted_at);
  if (runAt == null) return history[0];

  return (
    history.find((solution) => {
      const at = timestamp(solution.inserted_at);
      return at != null && at <= runAt;
    }) ?? history[history.length - 1]
  );
}

/** During the break the server sets the round's start in the future. */
export function isOnBreak(tournament: GroupTournament | null | undefined, nowMs = Date.now()) {
  const startedAt = tournament?.last_round_started_at || tournament?.started_at;
  return startedAt ? parseServerDate(startedAt).getTime() > nowMs : false;
}

export const isSeedRound = (tournament: GroupTournament) =>
  tournament.type === 'ranked' && tournament.has_seed_round && tournament.current_round_position === 1;

function detectOS(): 'windows' | 'mac' | 'linux' {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = (nav.userAgentData?.platform || navigator.platform || navigator.userAgent || '').toLowerCase();
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac') || platform.includes('iphone') || platform.includes('ipad')) return 'mac';
  return 'linux';
}

/**
 * vscode://file/... link that opens <folder>. VS Code doesn't expand `~` or env vars and the
 * browser can't know the home directory, so players extract the folder into a fixed shared
 * location: /Users/Shared (macOS), C:\Users\Public (Windows), /tmp (Linux).
 */
export function vscodeFolderUrl(folder: string | null | undefined) {
  const safe = (folder ?? '').trim().replace(/^[/\\]+|[/\\]+$/g, '');
  if (!safe) return null;

  const encoded = safe.split(/[/\\]+/).map(encodeURIComponent).join('/');

  switch (detectOS()) {
    case 'windows':
      return `vscode://file/C:/Users/Public/${encoded}`;
    case 'linux':
      return `vscode://file//tmp/${encoded}`;
    default:
      return `vscode://file//Users/Shared/${encoded}`;
  }
}
