// The legacy info panel modes (ControlPanel PanelModeCodes) — same ids, so old #hash links work.
export const PanelMode = {
  rating: 'ratingMode',
  reports: 'reportsMode',
  cheaters: 'cheatersMode',
  leaderboard: 'leaderboardMode',
  player: 'playerMode',
  topUsersByClan: 'top_users_by_clan_ranking',
  tasksRanking: 'tasks_ranking',
  clansBubble: 'clans_bubble_distribution',
  langs: 'langs_distribution',
  taskAdvanced: 'task_rating_advanced',
  about: 'about',
} as const;

export type PanelModeId = (typeof PanelMode)[keyof typeof PanelMode];

// Labels are the legacy i18n keys.
export const PANEL_TITLES: Record<PanelModeId, string> = {
  ratingMode: 'Players & Matches',
  reportsMode: 'Reports Panel',
  cheatersMode: 'Cheaters Panel',
  playerMode: 'Player Panel',
  leaderboardMode: 'Leaderboard',
  top_users_by_clan_ranking: 'Top users by clan ranking',
  tasks_ranking: 'Tasks ranking',
  clans_bubble_distribution: 'Clans bubble distribution',
  langs_distribution: 'Languages',
  task_rating_advanced: 'Duration distribution and top users by task',
  about: 'About',
};

const BASE: PanelModeId[] = [PanelMode.player, PanelMode.leaderboard];
const FINISHED: PanelModeId[] = [...BASE, PanelMode.topUsersByClan, PanelMode.tasksRanking, PanelMode.clansBubble, PanelMode.langs];
const ALL: PanelModeId[] = [
  PanelMode.player,
  PanelMode.rating,
  PanelMode.leaderboard,
  PanelMode.topUsersByClan,
  PanelMode.tasksRanking,
  PanelMode.clansBubble,
  PanelMode.langs,
  PanelMode.reports,
  PanelMode.cheaters,
];

/**
 * Legacy rules: moderators see everything (reports and cheaters only for admins);
 * others get the player panel and leaderboard, plus the analytics once finished.
 * About (the description) is always last.
 */
const NEEDS_GAMES: PanelModeId[] = [PanelMode.rating, PanelMode.topUsersByClan, PanelMode.tasksRanking, PanelMode.clansBubble, PanelMode.langs];

export function allowedPanels({
  moderator,
  admin,
  started,
  finished,
}: {
  moderator: boolean;
  admin: boolean;
  started: boolean;
  finished: boolean;
}) {
  const list = moderator
    ? ALL.filter((mode) => admin || (mode !== PanelMode.reports && mode !== PanelMode.cheaters))
    : finished
      ? FINISHED
      : BASE;
  // Until the end the Ranking card already shows the standings; before the start
  // there are no games to analyse (and the ranking lists who joined).
  return [
    ...list.filter((mode) => (finished || mode !== PanelMode.leaderboard) && (started || !NEEDS_GAMES.includes(mode))),
    PanelMode.about,
  ];
}

/** Top-level tabs; Statistics and Moderation hold several panels behind a segmented control. */
export const PANEL_GROUPS: { id: string; title: string; modes: PanelModeId[]; sub?: Partial<Record<PanelModeId, string>> }[] = [
  { id: 'player', title: 'Player Panel', modes: [PanelMode.player] },
  { id: 'matches', title: 'Players & Matches', modes: [PanelMode.rating] },
  { id: 'leaderboard', title: 'Leaderboard', modes: [PanelMode.leaderboard] },
  {
    id: 'stats',
    title: 'Statistics',
    modes: [PanelMode.topUsersByClan, PanelMode.tasksRanking, PanelMode.clansBubble, PanelMode.langs, PanelMode.taskAdvanced],
    sub: {
      top_users_by_clan_ranking: 'Top clans',
      tasks_ranking: 'Tasks',
      clans_bubble_distribution: 'Clans chart',
      langs_distribution: 'Languages',
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
