import { getLocale, t } from '@/i18n';

import type { GameLevel, LobbyGame, LobbyPlayer, TournamentGrade } from './types';

export const LEVELS: GameLevel[] = ['elementary', 'easy', 'medium', 'hard'];

export const LEVEL_COLORS: Record<GameLevel, string> = {
  elementary: 'blue',
  easy: 'green',
  medium: 'orange',
  hard: 'red',
};

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** "elementary" → "Elementary" / "Начальный". */
export const levelLabel = (level: GameLevel) => t(capitalize(level));

/** "grand_slam" → "Grand Slam" / "Гранд-слэм". */
export const gradeLabel = (grade: string) => t(grade.split('_').map(capitalize).join(' '));

// First place award per grade (legacy config/grades.ts getRankingPoints).
const RANKING_POINTS: Partial<Record<TournamentGrade, number>> = {
  rookie: 8,
  challenger: 16,
  pro: 128,
  elite: 256,
  masters: 1024,
  grand_slam: 2048,
};

export const rankingPoints = (grade: TournamentGrade) => RANKING_POINTS[grade] ?? null;

/** "pro" → "Pro", "elite tournament #12" → "Elite Tournament #12" (localized), anything else as is. */
export function tournamentTitle(name: string, grade: TournamentGrade) {
  const normalized = name.toLowerCase().replaceAll(' ', '_');

  if (normalized === grade) return gradeLabel(grade);

  const generated = name.match(/^(rookie|challenger|pro|elite|masters|grand[_ ]slam) tournament #(\d+)$/i);

  return generated
    ? t('%{grade} Tournament #%{number}', {
        grade: gradeLabel(generated[1].toLowerCase().replace(' ', '_')),
        number: generated[2],
      })
    : name;
}

// Server datetimes are UTC; NaiveDateTime values come without a zone suffix.
export const parseUtc = (value: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);

// Formatters follow the app locale (not the browser's), in the viewer's timezone.
const formatters = new Map<string, Intl.DateTimeFormat>();

function dateTimeFormat(key: string, options: Intl.DateTimeFormatOptions) {
  const cacheKey = `${getLocale()}:${key}`;
  let formatter = formatters.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(getLocale(), options);
    formatters.set(cacheKey, formatter);
  }

  return formatter;
}

/** "Oct 12" / "12 окт." */
export const formatDate = (value: string) =>
  dateTimeFormat('date', { month: 'short', day: 'numeric' }).format(parseUtc(value));

/** "16:00" */
export const formatTime = (value: string) =>
  dateTimeFormat('time', { hour: '2-digit', minute: '2-digit', hour12: false }).format(parseUtc(value));

/** "Oct 12, 2026 at 16:00" / "12 окт. 2026 г. в 16:00" */
export function formatStartsAt(value: string) {
  const date = dateTimeFormat('long-date', { month: 'short', day: 'numeric', year: 'numeric' }).format(parseUtc(value));

  return t('%{date} at %{time}', { date, time: formatTime(value) });
}

/** "in 9 days" / "через 9 дней", for starts beyond the live countdown window. */
export function formatStartsIn(ms: number) {
  const relative = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  const hours = Math.round(ms / (60 * 60 * 1000));

  return hours < 48 ? relative.format(hours, 'hour') : relative.format(Math.round(hours / 24), 'day');
}

export const msUntil = (value: string) => parseUtc(value).getTime() - Date.now();

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Percent of asserts passed in the player's last check (0 before the first one). */
export function checkProgress(player: LobbyPlayer) {
  const result = player.check_result;

  if (!result || !result.asserts_count) return 0;

  return Math.round((result.success_count / result.asserts_count) * 100);
}

export const isPlayer = (game: LobbyGame, userId: number) => game.players.some(({ id }) => id === userId);

const levelIndex = (level: GameLevel) => LEVELS.indexOf(level);

/** The current user's games first, then games with people, then bot games; easy to hard within each. */
export function sortGames(games: LobbyGame[], userId: number) {
  const group = (game: LobbyGame) => (isPlayer(game, userId) ? 0 : game.is_bot ? 2 : 1);

  return [...games].sort((a, b) => group(a) - group(b) || levelIndex(a.level) - levelIndex(b.level) || b.id - a.id);
}
