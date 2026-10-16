import { useQuery } from '@tanstack/react-query';

import type { CheckResult } from './types';

// Finished games are replayed from their playbook (GET /api/v1/playbook/:id,
// Codebattle.Playbook records): "init" per player, then editor diffs, checks, give-ups…
// A game still in memory (just over, or the minutes after a timeout) serves its raw records:
// editor updates carry the whole `editor_text` instead of a diff.

interface DeltaOp {
  insert?: string;
  retain?: number;
  delete?: number;
}

interface PlaybookRecord {
  type: string;
  id?: number;
  time?: number;
  name?: string;
  editor_text?: string;
  editor_lang?: string;
  check_result?: CheckResult;
  message?: string;
  diff?: { delta: DeltaOp[]; next_lang?: string; time?: number };
}

interface Playbook {
  records: PlaybookRecord[];
  winner_id: number | null;
  /** Admin review: "complete" (approved for bots), "banned" (rejected) or "incomplete". */
  solution_type?: string | null;
}

export interface ReplayPlayerState {
  text: string;
  lang: string;
  checking: boolean;
  output?: CheckResult;
  result?: 'gave_up';
}

export interface ReplayStep {
  /** ms since the first record. */
  at: number;
  players: Record<number, ReplayPlayerState>;
  /** What happened at this step, for the scrubber tooltip. */
  event: { type: string; playerId?: number; message?: string; name?: string };
}

/** Applies a quill-style delta (retain / insert / delete) to `text`. */
export function applyDelta(text: string, ops: DeltaOp[]) {
  let out = '';
  let cursor = 0;
  for (const op of ops) {
    if (op.retain != null) {
      out += text.slice(cursor, cursor + op.retain);
      cursor += op.retain;
    } else if (op.delete != null) {
      cursor += op.delete;
    } else if (op.insert != null) {
      out += op.insert;
    }
  }
  return out + text.slice(cursor);
}

/** Precomputes the state after every record, so scrubbing is instant. */
export function buildTimeline(playbook: Playbook): ReplayStep[] {
  const inits = playbook.records.filter((record) => record.type === 'init');
  const rest = playbook.records.filter((record) => record.type !== 'init');
  const start = inits[0]?.time ?? rest[0]?.time ?? 0;

  let players: Record<number, ReplayPlayerState> = Object.fromEntries(
    inits.map((record) => [record.id!, { text: record.editor_text ?? '', lang: record.editor_lang ?? 'js', checking: false }]),
  );
  const steps: ReplayStep[] = [{ at: 0, players, event: { type: 'init' } }];
  let at = 0;

  for (const record of rest) {
    at = record.time ? record.time - start : at + (record.diff?.time ?? 0);
    const id = record.id;
    const current = id != null ? players[id] : undefined;
    const patch = (next: Partial<ReplayPlayerState>) => {
      if (id == null || !current) return;
      players = { ...players, [id]: { ...current, ...next } };
    };

    switch (record.type) {
      case 'update_editor_data':
        patch(
          record.editor_text != null
            ? { text: record.editor_text, lang: record.editor_lang ?? current?.lang }
            : { text: applyDelta(current?.text ?? '', record.diff?.delta ?? []), lang: record.diff?.next_lang ?? current?.lang },
        );
        break;
      case 'start_check':
        patch({ checking: true });
        break;
      case 'check_complete':
        patch({
          checking: false,
          output: record.check_result,
          ...(record.editor_text != null ? { text: record.editor_text } : {}),
          ...(record.editor_lang ? { lang: record.editor_lang } : {}),
        });
        break;
      case 'give_up':
        patch({ result: 'gave_up' });
        break;
      case 'update_editor_lang':
      case 'join_chat':
      case 'leave_chat':
      case 'toggle_ban_player':
        continue;
      default:
        break;
    }

    steps.push({ at: Math.max(at, steps[steps.length - 1].at), players, event: { type: record.type, playerId: id, message: record.message, name: record.name } });
  }

  return steps;
}

export function usePlaybook(gameId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['playbook', gameId],
    enabled,
    staleTime: Infinity,
    queryFn: async () => {
      const response = await fetch(`/api/v1/playbook/${gameId}`, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`playbook ${response.status}`);
      const playbook = (await response.json()) as Playbook;
      return { steps: buildTimeline(playbook), solutionType: playbook.solution_type ?? null };
    },
  });
}
