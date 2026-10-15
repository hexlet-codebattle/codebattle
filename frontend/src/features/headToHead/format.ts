import { getLocale, t } from '@/i18n';
import { parseServerDate } from '@/shared/date';

import type { GameResult, H2HGame } from './types';

const FINISHED_STATES = ['game_over', 'timeout'];

export interface ResultTone {
  label: string;
  /** Mantine palette for a light badge. */
  color: string;
  kind: 'won' | 'lost' | 'draw' | 'pending';
}

/** One player's result in a game: Won / Lost / Gave up / Timeout / Draw, or Pending while it runs. */
export function resultTone(result: GameResult | null, game: H2HGame): ResultTone {
  if (result === 'won') return { label: t('Won'), color: 'green', kind: 'won' };
  if (result === 'lost') return { label: t('Lost'), color: 'red', kind: 'lost' };
  if (result === 'gave_up') return { label: t('Gave up'), color: 'red', kind: 'lost' };
  if (result === 'timeout') return { label: t('Timeout'), color: 'gray', kind: 'draw' };
  if (FINISHED_STATES.includes(game.state)) return { label: t('Draw'), color: 'gray', kind: 'draw' };

  return { label: t('Pending'), color: 'slate', kind: 'pending' };
}

const STATE_LABELS: Record<string, string> = {
  game_over: 'Finished',
  waiting_opponent: 'Waiting',
  timeout: 'Timeout',
  playing: 'Playing',
  canceled: 'Canceled',
};

const STATE_COLORS: Record<string, string> = {
  game_over: 'slate',
  playing: 'blue',
  waiting_opponent: 'orange',
  timeout: 'gray',
  canceled: 'gray',
};

export const stateLabel = (state: string | null | undefined) =>
  state ? t(STATE_LABELS[state] ?? state.replaceAll('_', ' ')) : t('Unknown');

export const stateColor = (state: string | null | undefined) => (state && STATE_COLORS[state]) || 'gray';

const MODE_LABELS: Record<string, string> = { standard: 'Standard', builder: 'Builder', training: 'Training' };
const TASK_TYPE_LABELS: Record<string, string> = { algorithms: 'Algorithms', css: 'CSS', sql: 'SQL' };

/** "Standard · Algorithms" / "Стандарт · Алгоритмы". */
export const modeLabel = (game: H2HGame) =>
  [game.mode && t(MODE_LABELS[game.mode] ?? game.mode), game.task_type && t(TASK_TYPE_LABELS[game.task_type] ?? game.task_type)]
    .filter(Boolean)
    .join(' · ');

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(key: 'short' | 'long') {
  const cacheKey = `${getLocale()}:${key}`;
  let value = formatters.get(cacheKey);

  if (!value) {
    value = new Intl.DateTimeFormat(
      getLocale(),
      key === 'short'
        ? { year: 'numeric', month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false },
    );
    formatters.set(cacheKey, value);
  }

  return value;
}

/** "Oct 12, 2026" */
export const formatDay = (value: string) => formatter('short').format(parseServerDate(value));

/** "Oct 12, 2026, 16:05" */
export const formatDateTime = (value: string) => formatter('long').format(parseServerDate(value));
