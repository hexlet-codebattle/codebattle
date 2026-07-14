export interface RoundCell {
  sliceIndex?: number;
  place?: number;
  score?: number;
}

export interface LeaderboardEntry {
  userId: number;
  name?: string;
  clan?: string;
  state?: string;
  sliceIndex?: number;
  totalScore?: number;
  rounds?: Record<string | number, RoundCell | undefined>;
}

export interface SlicePlayer {
  userId: number;
  name: string;
  clan?: string;
  place?: number;
  score: number;
}

export interface RunResult {
  viewerHtml?: string;
}

export interface Run {
  id: number | string;
  kind?: string;
  status?: string;
  isStub?: boolean;
  place?: number;
  score?: number;
  roundPosition?: number;
  sliceIndex?: number;
  durationMs?: number;
  detailsLoaded?: boolean;
  result?: RunResult;
}

export interface GroupTournament {
  type?: string;
  state?: string;
  isInfinite?: boolean;
  hasSeedRound?: boolean;
  currentRoundPosition?: number;
  roundsCount?: number;
  startsAt?: string;
  startedAt?: string;
  lastRoundStartedAt?: string;
  seedRoundTimeoutSeconds?: number;
  roundTimeoutSeconds?: number;
  localFolder?: string;
}

export interface ExternalSetup {
  state?: string;
  repoState?: string;
  roleState?: string;
  secretState?: string;
  repoSlug?: string;
  repoUrl?: string;
  lastError?: Record<string, unknown>;
}

export interface Invite {
  state?: string;
  inviteLink?: string;
}

export interface TournamentMeta {
  tournamentDetailsUrl?: string;
  tournamentDetailsLabel?: string;
  taskInfoLabel?: string;
  taskInfoIconUrl?: string;
  taskDurationLabel?: string;
  taskDurationIconUrl?: string;
  stepsTitle?: string;
  step1Label?: string;
  step1ButtonLabel?: string;
  step2Label?: string;
  step2ButtonLabel?: string;
}

export interface Lang {
  slug: string;
  name: string;
  version?: string;
}
