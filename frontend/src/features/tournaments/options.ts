// Option lists and per-option explanations for the tournament form. Labels and
// descriptions are the legacy form's English strings, so the existing Russian
// entries in ru/default.po translate them.

export const TOURNAMENT_TYPES = [
  { value: 'ladder', label: 'Ladder (continuous matchmaking)' },
  { value: 'swiss', label: 'Swiss' },
];

export const TYPE_DESCRIPTIONS: Record<string, string> = {
  swiss:
    'Players are paired each round against opponents with a similar score. Runs for a fixed number of rounds — good for balanced, bracket-style events.',
  ladder:
    'Continuous pool matchmaking. "Rounds Limit" is the number of matching rounds; "Round Timeout" is the matching interval. Timeout and score are fixed (per-task, static base score).',
};

export const ACCESS_TYPES = [
  { value: 'public', label: 'Public' },
  { value: 'token', label: 'Token (Private)' },
];

export const ACCESS_TYPE_DESCRIPTIONS: Record<string, string> = {
  public: 'Anyone can find and join this tournament.',
  token: 'Only players who have the invite link can join.',
};

export const TASK_PROVIDERS = [
  { value: 'level', label: 'Level' },
  { value: 'level_progression', label: 'Level progression' },
  { value: 'task_pack', label: 'Task Pack' },
  { value: 'tags', label: 'Tags' },
];

export const TASK_PROVIDER_DESCRIPTIONS: Record<string, string> = {
  level: 'Tasks are picked automatically from the chosen difficulty level.',
  level_progression: 'Rounds get harder: elementary first, then easy and medium. With Hard, the last round is hard.',
  task_pack: "Tasks come from a fixed task pack, played in the pack's order.",
  tags: 'Tasks are picked by the given tags and difficulty level.',
};

export const TASK_STRATEGIES = [
  { value: 'random', label: 'Random' },
  { value: 'sequential', label: 'Sequential' },
];

export const TASK_STRATEGY_DESCRIPTIONS: Record<string, string> = {
  random: 'Each player gets tasks in a random order.',
  sequential: 'All players get tasks in the same fixed order.',
};

export const SCORE_STRATEGIES = [
  { value: '75_percentile', label: '75 Percentile' },
  { value: 'static_base_score', label: 'Static Base Score' },
  { value: 'win_loss', label: 'Win/Loss' },
];

export const SCORE_STRATEGY_DESCRIPTIONS: Record<string, string> = {
  '75_percentile': 'Score is based on the 75th percentile of solve times — faster solutions score higher.',
  static_base_score: "Each task gives a fixed base score regardless of the player's solve time.",
  win_loss: 'Only the match result counts — a win or a loss, with no partial score.',
};

export const TIMEOUT_MODES = [
  { value: 'per_task', label: 'Per task timeout' },
  { value: 'per_round_fixed', label: 'Per round (fixed)' },
  { value: 'per_round_with_rematch', label: 'Per round (with rematch)' },
  { value: 'per_tournament', label: 'Per tournament timeout' },
];

export const TIMEOUT_DESCRIPTIONS: Record<string, string> = {
  per_task: "Each game uses the task's own time limit. Different tasks may have different timeouts.",
  per_round_fixed: 'All games in a round share a fixed timeout. One task per round.',
  per_round_with_rematch:
    'Each round has a fixed timeout. Players play multiple tasks (rematches) within the round until time runs out.',
  per_tournament:
    'One global timeout for the entire tournament. Games use the remaining tournament time. Tournament ends automatically when time expires.',
};

export const PLAYERS_LIMITS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];

// Pre-filled for new tournaments; the whole string is an i18n key.
export const DEFAULT_DESCRIPTION = `- ✅ Solve each task correctly to earn points
- ⚡ Faster solutions rank higher
- 🤝 Be respectful to other players

Good luck and have fun! 🚀`;

// Playful default names; `phrase` is an i18n key, the emoji is neutral.
export const FUN_NAMES: { emoji: string; phrase: string }[] = [
  { emoji: '🔥', phrase: 'Code Rumble' },
  { emoji: '⚔️', phrase: 'Byte Brawl' },
  { emoji: '🏟️', phrase: 'Algo Arena Showdown' },
  { emoji: '🐛', phrase: 'The Great Bug Hunt' },
  { emoji: '💥', phrase: 'Syntax Smackdown' },
  { emoji: '🌙', phrase: 'Midnight Code Clash' },
  { emoji: '🚀', phrase: 'Turbo Loop Rumble' },
  { emoji: '⚡', phrase: 'Hack & Slash' },
  { emoji: '🌀', phrase: 'Recursion Rampage' },
  { emoji: '🎮', phrase: 'Stack Overflow Showdown' },
];

/** Settings of the user's last tournament (TournamentController.index `last_tournament`). */
export interface LastTournament {
  type?: string;
  name?: string;
  description?: string;
  access_type?: string;
  task_provider?: string;
  task_strategy?: string;
  level?: string;
  task_pack_name?: string | null;
  moderator_ids?: number[] | null;
  players_limit?: number;
  rounds_limit?: number;
  timeout_mode?: string;
  round_timeout_seconds?: number | null;
  tournament_timeout_seconds?: number | null;
  break_duration_seconds?: number;
  use_chat?: boolean;
  ranking_type?: string;
  score_strategy?: string;
  meta?: Record<string, unknown> | null;
}

/** "2026-10-13T18:05" in the browser's timezone (what <input type="datetime-local"> takes). */
export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};
