import type { GameLevel } from '@/features/lobby/types';

// Codebattle.Task JSON (its Jason `only:` list) — fields the page reads.

export interface ArgType {
  name: string;
  nested?: ArgType;
}

export interface Assert {
  arguments: unknown[];
  expected: unknown;
}

export interface Task {
  id: number;
  name: string;
  level: GameLevel;
  state: string;
  visibility: string;
  origin: string | null;
  type: string | null;
  tags: string[];
  description_en: string | null;
  description_ru: string | null;
  input_signature: { argument_name: string; type: ArgType }[];
  output_signature: { type: ArgType } | null;
  asserts: Assert[];
  asserts_examples: Assert[];
  time_to_solve_sec: number | null;
  base_score: number | null;
  creator_id: number | null;
}

/** Codebattle.Task.Stats.get_stats/1; times are whole-game seconds of winning games. */
export interface TaskStats {
  games_count: number;
  winners_count: number;
  percentiles: { count: number; p10: number | null; p30: number | null; p50: number | null; p75: number | null; p95: number | null };
  leaderboard: { game_id: number; duration_sec: number; user_id: number; user_name: string; rating: number; lang: string }[];
}

export interface TaskMeta {
  creator: { id: number; name: string } | null;
  inserted_at: string;
  updated_at: string;
}

const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

/** PATCH /api/v1/tasks/:id with one or more fields; resolves with the saved task. */
export async function patchTask(id: number, fields: Partial<Task>): Promise<Task> {
  const response = await fetch(`/api/v1/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
    body: JSON.stringify({ task: fields }),
  });
  if (!response.ok) throw new Error(`task update: ${response.status}`);

  return (await response.json()).task;
}

/** POST /games/create_by_task: a hidden game against a bot with this task. */
export async function createGameByTask(taskId: number): Promise<number> {
  const response = await fetch('/games/create_by_task', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
    body: JSON.stringify({ task_id: taskId }),
  });
  if (!response.ok) throw new Error(`create game: ${response.status}`);

  return (await response.json()).game_id;
}

/** integer, array<integer>, hash<array<string>> … */
export const typeName = (type: ArgType | undefined): string =>
  type ? (type.nested ? `${type.name}<${typeName(type.nested)}>` : type.name) : 'unknown';

/** 42 → "42s", 125 → "2m 5s", 120 → "2m" (legacy formatDuration). */
export function formatDuration(value: number | null | undefined) {
  if (value == null) return '—';
  const total = Math.round(value);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}
