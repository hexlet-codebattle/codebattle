// The legacy info panel modes (ControlPanel PanelModeCodes) — same ids, so old #hash links work.
export const PanelMode = {
  rating: 'ratingMode',
  live: 'liveMode',
  reports: 'reportsMode',
  cheaters: 'cheatersMode',
  leaderboard: 'leaderboardMode',
  player: 'playerMode',
  topUsersByClan: 'top_users_by_clan_ranking',
  tasksRanking: 'tasks_ranking',
  langs: 'langs_distribution',
  taskAdvanced: 'task_rating_advanced',
  about: 'about',
} as const;

export type PanelModeId = (typeof PanelMode)[keyof typeof PanelMode];

// Labels are the legacy i18n keys.
export const PANEL_TITLES: Record<PanelModeId, string> = {
  ratingMode: 'Players & Matches',
  liveMode: 'Live games',
  reportsMode: 'Reports Panel',
  cheatersMode: 'Cheaters Panel',
  playerMode: 'Player Panel',
  leaderboardMode: 'Leaderboard',
  top_users_by_clan_ranking: 'Top users by clan ranking',
  tasks_ranking: 'Tasks ranking',
  langs_distribution: 'Languages',
  task_rating_advanced: 'Duration distribution and top users by task',
  about: 'About',
};

const ALL: PanelModeId[] = [
  PanelMode.player,
  PanelMode.rating,
  PanelMode.live,
  PanelMode.leaderboard,
  PanelMode.tasksRanking,
  PanelMode.langs,
  PanelMode.topUsersByClan,
  PanelMode.reports,
  PanelMode.cheaters,
];

/**
 * Everyone, guests included, sees every player's matches and the analytics;
 * reports and cheaters stay with admins. Live games exist only while the tournament runs.
 * About (the description) is always last.
 */
const NEEDS_GAMES: PanelModeId[] = [PanelMode.rating, PanelMode.topUsersByClan, PanelMode.tasksRanking, PanelMode.langs];

export function allowedPanels({ admin, started, finished }: { admin: boolean; started: boolean; finished: boolean }) {
  const list = ALL.filter((mode) => admin || (mode !== PanelMode.reports && mode !== PanelMode.cheaters));
  // Until the end the Ranking card already shows the standings; before the start
  // there are no games to analyse (and the ranking lists who joined).
  return [
    ...list.filter(
      (mode) =>
        (finished || mode !== PanelMode.leaderboard) &&
        (started || !NEEDS_GAMES.includes(mode)) &&
        (mode !== PanelMode.live || (started && !finished)),
    ),
    PanelMode.about,
  ];
}

/** Top-level tabs; Statistics and Moderation hold several panels behind a segmented control. */
export const PANEL_GROUPS: { id: string; title: string; modes: PanelModeId[]; sub?: Partial<Record<PanelModeId, string>> }[] = [
  { id: 'player', title: 'Player Panel', modes: [PanelMode.player] },
  { id: 'matches', title: 'Players & Matches', modes: [PanelMode.rating] },
  { id: 'live', title: 'Live games', modes: [PanelMode.live] },
  { id: 'leaderboard', title: 'Leaderboard', modes: [PanelMode.leaderboard] },
  {
    id: 'stats',
    title: 'Statistics',
    // Tasks open first; the clan ranking comes last.
    modes: [PanelMode.tasksRanking, PanelMode.langs, PanelMode.topUsersByClan, PanelMode.taskAdvanced],
    sub: {
      tasks_ranking: 'Tasks',
      langs_distribution: 'Languages',
      top_users_by_clan_ranking: 'Clans',
    },
  },
  {
    id: 'moderation',
    title: 'Moderation',
    modes: [PanelMode.reports, PanelMode.cheaters],
    sub: { reportsMode: 'Reports', cheatersMode: 'Cheaters' },
  },
  { id: 'about', title: 'About', modes: [PanelMode.about] },
];

export const groupOf = (mode: PanelModeId) => PANEL_GROUPS.find((group) => group.modes.includes(mode))!;
