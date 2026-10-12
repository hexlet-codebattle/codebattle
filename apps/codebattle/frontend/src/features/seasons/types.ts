import { getLocale, t } from '@/i18n';

import type { TournamentGrade } from '@/features/lobby/types';

// Codebattle.Season and Codebattle.SeasonResult as their Jason encoders send them.

export interface Season {
  id: number;
  name: string;
  year: number;
  /** Dates, "2026-09-21". */
  starts_at: string;
  ends_at: string;
}

export interface SeasonResult {
  id: number;
  season_id: number;
  user_id: number;
  user_name: string;
  user_lang: string | null;
  avatar_url: string | null;
  clan_id: number | null;
  clan_name: string | null;
  place: number;
  total_points: number;
  total_score: number;
  tournaments_count: number;
  total_games_count: number;
  total_wins_count: number;
  /** Decimal, sent as a string ("3.50"). */
  avg_place: string | number | null;
  best_place: number | null;
  /** Seconds. */
  total_time: number;
}

/** GET /api/v1/seasons/:season_id/players/:user_id/stats (SeasonResult.get_player_detailed_stats/2). */
export interface PlayerStats {
  season_result: SeasonResult;
  grade_stats: {
    grade: TournamentGrade;
    tournaments_count: number;
    total_points: number;
    total_score: number;
    total_games: number;
    total_wins: number;
    best_place: number | null;
    avg_place: number | null;
    total_time: number;
    podium_finishes: number[];
  }[];
  recent_tournaments: {
    tournament_id: number;
    tournament_name: string | null;
    grade: TournamentGrade;
    started_at: string;
    place: number;
    points: number;
    score: number;
    games_count: number;
    wins_count: number;
    total_time: number;
    total_participants: number;
  }[];
  performance_trend: {
    week: string;
    tournaments_count: number;
    total_points: number;
    total_wins: number;
    total_games: number;
    avg_place: number | null;
  }[];
}

export type SeasonStatus = 'upcoming' | 'active' | 'finished';

const day = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00Z`).getTime();
const DAY_MS = 24 * 3600 * 1000;

export function seasonStatus(season: Season, now = Date.now()): SeasonStatus {
  if (now < day(season.starts_at)) return 'upcoming';
  // The season includes its last day.
  if (now < day(season.ends_at) + DAY_MS) return 'active';
  return 'finished';
}

/** Share of the season already played (0..1) and whole days left. */
export function seasonProgress(season: Season, now = Date.now()) {
  const start = day(season.starts_at);
  const end = day(season.ends_at) + DAY_MS;
  const share = Math.min(1, Math.max(0, (now - start) / (end - start)));

  return { share, daysLeft: Math.max(0, Math.ceil((end - now) / DAY_MS)) };
}

/** "Season 3, 2026" for numbered seasons, "Winter Cup 2026" otherwise. */
export const seasonTitle = (season: Pick<Season, 'name' | 'year'>) =>
  /^\d+$/.test(season.name)
    ? t('Season %{name}, %{year}', { name: season.name, year: season.year })
    : `${season.name} ${season.year}`;

const dateFormat = () =>
  new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "Sep 21, 2026 – Dec 21, 2026" */
export const seasonDates = (season: Season) =>
  `${dateFormat().format(day(season.starts_at))} – ${dateFormat().format(day(season.ends_at))}`;

export const avgPlace = (value: SeasonResult['avg_place']) => (value == null ? null : Number(value));

/** 93784 s → "26h 3m"; under an hour → "42m". */
export function formatPlayTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return hours ? t('%{hours}h %{minutes}m', { hours, minutes }) : t('%{minutes}m', { minutes });
}

/** Percent of players with a worse place ("better than 87%"). */
export const betterThan = (place: number, total: number) => (total > 1 ? Math.round(((total - place) / (total - 1)) * 100) : 100);
