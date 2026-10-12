// Profile data — the same endpoints the legacy profile widget uses. Only the
// fields the page reads are typed.

import type { GameLevel, TournamentGrade } from '@/features/lobby/types';
import type { Achievement, UserCardData } from '@/features/users/api';

export class NotFoundError extends Error {}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (response.status === 404) throw new NotFoundError(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);

  return response.json();
}

export interface SeasonResult {
  season_id: number;
  season_name: string;
  season_year: number;
  place: number;
  total_points: number;
  tournaments_count: number;
  total_games_count: number;
  total_wins_count: number;
}

export interface ProfileStats {
  user: UserCardData['user'] & {
    clan_id: number | null;
    github_name: string | null;
    inserted_at: string;
    is_bot: boolean;
  };
  active_game_id: number | null;
  last_active_at?: string | null;
  achievements: Achievement[];
  season_results: SeasonResult[];
  metrics: UserCardData['metrics'] & { language_stats: Record<string, number> };
}

/** GET /api/v1/user/:id/stats (404 for unknown or non-numeric ids). */
export const fetchProfile = (userId: string) => getJson<ProfileStats>(`/api/v1/user/${userId}/stats`);

export interface Rival {
  id: number;
  name: string;
  clan: string | null;
  games_count: number;
  wins_count: number;
  losses_count: number;
  timeouts_count: number;
}

/** Up to 3 most-played human opponents. */
export const fetchRivals = async (userId: string) =>
  (await getJson<{ top_rivals: Rival[] }>(`/api/v1/user/${userId}/rivals`)).top_rivals;

export interface Activity {
  activities: { date: string; count: number }[];
  meta: { year: number | null; start_date: string; end_date: string };
}

/** Games per day: the last 365 days, or a calendar year. */
export const fetchActivity = (userId: string, year: number | null) =>
  getJson<Activity>(`/api/v1/${userId}/activity${year ? `?year=${year}` : ''}`);

export interface PageInfo {
  page_number: number;
  page_size: number;
  total_entries: number;
  total_pages: number;
}

export interface TournamentResult {
  tournament_id: number;
  tournament_name: string;
  tournament_grade: TournamentGrade | null;
  tournament_finished_at: string | null;
  tournament_started_at: string | null;
  place: number;
  points: number;
  score: number;
  games_count: number;
  wins_count: number;
  total_time: number | null;
  user_lang: string | null;
}

export const PAGE_SIZE = 20;

export const fetchTournaments = (userId: string, page: number) =>
  getJson<{ tournaments: TournamentResult[]; page_info: PageInfo }>(
    `/api/v1/user/${userId}/tournaments?page=${page}&page_size=${PAGE_SIZE}`,
  );

export interface CompletedGamePlayer {
  id: number;
  name: string;
  is_bot: boolean;
  is_guest: boolean;
  rating: number | null;
  rating_diff: number | null;
  result: 'won' | 'lost' | 'gave_up' | 'timeout' | string;
  lang: string | null;
}

export interface CompletedGame {
  id: number;
  level: GameLevel;
  finishes_at: string | null;
  duration: number | null;
  players: CompletedGamePlayer[];
}

export const fetchCompletedGames = (userId: string, page: number) =>
  getJson<{ games: CompletedGame[]; page_info: PageInfo }>(
    `/api/v1/games/completed?user_id=${userId}&page_size=${PAGE_SIZE}&page=${page}`,
  );
