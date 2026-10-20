import { parseUtc } from '@/features/lobby/format';
import type { TournamentGrade, TournamentState } from '@/features/lobby/types';

// GET /api/v1/tournaments (Api.V1.TournamentController.index, @public_fields) and
// GET /api/v1/tournaments/history. Only the fields the schedule reads are typed.

export interface ScheduleTournament {
  id: number;
  name: string;
  grade: TournamentGrade;
  state: TournamentState;
  type: string;
  starts_at: string;
  started_at: string | null;
  last_round_ended_at: string | null;
  players_count: number | null;
  players_limit: number | null;
  rounds_limit: number | null;
  description: string | null;
  creator_id: number | null;
  task_pack_name: string | null;
}

export interface HistoryTournament {
  id: number;
  name: string;
  grade: TournamentGrade;
  type: string;
  state: TournamentState;
  starts_at: string;
  last_round_ended_at: string | null;
  players_count: number | null;
  winner: { id: number; name: string; avatar_url: string | null } | null;
}

/** A tournament placed on the calendar. */
export interface ScheduleEvent {
  tournament: ScheduleTournament;
  start: Date;
  end: Date;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

export const fetchSchedule = (from: Date, to: Date) =>
  fetchJson<{ season_tournaments: ScheduleTournament[]; user_tournaments: ScheduleTournament[] }>(
    `/api/v1/tournaments?${new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })}`,
  );

export const fetchHistory = () => fetchJson<{ tournaments: HistoryTournament[] }>('/api/v1/tournaments/history');

const MINUTE = 60 * 1000;

/** Finished: until the last round ended; otherwise a planned slot (Rookie 15 min, others an hour). */
export function toEvent(tournament: ScheduleTournament): ScheduleEvent {
  const start = parseUtc(tournament.starts_at);
  const ended = tournament.state === 'finished' && tournament.last_round_ended_at ? parseUtc(tournament.last_round_ended_at) : null;
  const end =
    ended && ended > start ? ended : new Date(start.getTime() + (tournament.grade === 'rookie' ? 15 : 60) * MINUTE);

  return { tournament, start, end };
}

/** "contest": the league; "my": tournaments I created, play or moderate; "all": everything (admins). */
export type ScheduleScope = 'contest' | 'my' | 'all';

export function scheduleEvents(
  data: { season_tournaments: ScheduleTournament[]; user_tournaments: ScheduleTournament[] },
  scope: ScheduleScope,
) {
  const pick =
    scope === 'my'
      ? data.user_tournaments
      : scope === 'all'
        ? [...data.season_tournaments, ...data.user_tournaments]
        : [...data.season_tournaments, ...data.user_tournaments.filter((tournament) => tournament.grade !== 'open')];

  const unique = new Map(pick.filter((tournament) => tournament.state !== 'canceled').map((tournament) => [tournament.id, tournament]));

  return [...unique.values()].map(toEvent).sort((a, b) => a.start.getTime() - b.start.getTime());
}

// --- calendar dates (local time) ---

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/** Spanish, Chinese and Russian calendars start on Monday; English on Sunday. */
export const weekStart = (locale: string) => (['ru', 'es', 'zh'].includes(locale) ? 1 : 0);

/** The 6-week grid shown for `month` (first day of it). */
export function monthGrid(month: Date, firstWeekday: number) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() - firstWeekday + 7) % 7;
  const start = addDays(first, -lead);

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
