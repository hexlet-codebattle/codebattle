import { camelizeKeys } from 'humps';

import { getPageProp } from '@/inertia/pageProps';

import GameRoomModes from '../config/gameModes';
import GameStateCodes from '../config/gameStateCodes';
import loadingStatuses from '../config/loadingStatuses';
import periodTypes from '../config/periodTypes';
import tournamentStates from '../config/tournament';
import userTypes from '../config/userTypes';
import {
  getGamePlayers,
  getGameStatus,
  getPlayersExecutionData,
  getPlayersText,
  makeEditorTextKey,
  setPlayerToSliceState,
} from '../utils/gameRoom';

// ******************************
//
// Stage 1: read the server-provided Inertia page props
//
// ******************************

const activeGamesData = getPageProp('active_games');
const completedGamesData = getPageProp('completed_games');
const currentUserData = getPageProp('current_user');
const gameData = getPageProp('game');
const isRecord = getPageProp('is_record', false);
const playerId = getPageProp<number | null>('player_id', null);
const tournamentData = getPageProp('tournament');
const tournamentId = getPageProp<number | null>('tournament_id', null);
const tournamentsData = getPageProp('tournaments');
const langsData = getPageProp('langs');
const leaderboardUsersData = getPageProp('leaderboard_users');
const eventData = getPageProp('event');
const reportsData = getPageProp('reports');
const seasonProfileData = getPageProp<{ score: number; place: number; rating: number } | undefined>(
  'season_profile',
);

// ******************************
//
// Stage 2: Converting data from elixir naming to javascript
// Example: { "game_params": { "game_id": 10 } } -> { gameParams: { gameId: 10 } }
//
// ******************************

const gameParams = gameData ? camelizeKeys(gameData) : undefined;
const tournamentParams = tournamentData ? camelizeKeys(tournamentData) : undefined;
const completedGamesParams = completedGamesData ? camelizeKeys(completedGamesData) : [];
const initialActiveGames = activeGamesData ? camelizeKeys(activeGamesData) : [];
const tournamentsParams = tournamentsData ? camelizeKeys(tournamentsData) : [];
const langsParams = langsData ? camelizeKeys(langsData) : [];
const currentUserParams = currentUserData ? camelizeKeys(currentUserData) : undefined;
const currentUserId = currentUserParams ? currentUserParams.id : null;
const initialLeaderboardUsers = leaderboardUsersData ? camelizeKeys(leaderboardUsersData) : [];
const initialEvent = eventData
  ? {
      ...camelizeKeys(eventData),
      loading: loadingStatuses.PENDING,
    }
  : {
      loading: loadingStatuses.PENDING,
    };
const reportsParams = reportsData ? { list: camelizeKeys(reportsData) } : {};

// TODO: camelizeKeys initialUsers and refactor all selectors/reducers/components
const initialUsers = currentUserParams
  ? {
      [currentUserParams.id]: {
        ...currentUserParams,
        type: userTypes.spectator,
      },
    }
  : {};
const seasonProfileParams = seasonProfileData
  ? {
      ...seasonProfileData,
    }
  : { score: 0, place: 0, rating: 1200 };

// ******************************
//
// Stage 3: Initial data for redux slices
//
// ******************************

export interface GameStatusState {
  state: string;
  msg: string;
  type: string | null;
  mode: string;
  startsAt: string | null;
  headToHead: unknown;
  timeoutSeconds: number | null;
  durationSec: number | null;
  finishesAt: string | null;
  hideBannedPlayerControls: boolean;
  rematchState: string | null;
  rematchInitiatorId: number | null;
  checking: Record<string, unknown>;
  solutionStatus: string | null;
  [key: string]: unknown;
}

export const defaultGameStatusState: GameStatusState = {
  state: GameStateCodes.initial,
  msg: '',
  type: null,
  mode: GameRoomModes.none,
  startsAt: null,
  headToHead: null,
  timeoutSeconds: null,
  durationSec: null,
  finishesAt: null,
  hideBannedPlayerControls: false,
  rematchState: null,
  rematchInitiatorId: null,
  checking: {},
  solutionStatus: null,
};

const initialGameStatus: GameStatusState = gameParams
  ? ({
      ...defaultGameStatusState,
      ...getGameStatus(gameParams),
    } as GameStatusState)
  : defaultGameStatusState;

const initialGameAward = gameParams ? gameParams.award : null;

const initialGameLocked = gameParams ? gameParams.locked : false;

const initialGameTask = gameParams ? gameParams.task : null;

const initialUseChat = gameParams ? gameParams.useChat : false;

const initialPlayers = gameParams
  ? (
      getGamePlayers(gameParams.players) as Array<Parameters<typeof setPlayerToSliceState>[1]>
    ).reduce(setPlayerToSliceState, {} as Record<string, unknown>)
  : {};

const initialLangs = gameParams ? gameParams.langs : langsParams;

interface PlayerTextEntry {
  userId: number;
  editorText?: string;
  langSlug: string;
}

const setPlayersMetaToSliseState = (
  state: Record<string, unknown>,
  { userId, langSlug }: PlayerTextEntry,
) => ({
  ...state,
  [userId]: {
    userId,
    currentLangSlug: langSlug,
    historyCurrentLangSlug: langSlug,
  },
});

const setPlayersTextToSliseState = (
  state: Record<string, unknown>,
  { userId, editorText, langSlug }: PlayerTextEntry,
) => ({
  ...state,
  [makeEditorTextKey(userId, langSlug)]: editorText,
});

const setPlayersLangToSliseState = (
  state: Record<string, unknown>,
  { userId, langSlug }: PlayerTextEntry,
) => ({
  ...state,
  [userId]: langSlug,
});

const initialMeta = gameParams
  ? gameParams.players.map(getPlayersText).reduce(setPlayersMetaToSliseState, {})
  : {};

const initialText = gameParams
  ? gameParams.players.map(getPlayersText).reduce(setPlayersTextToSliseState, {})
  : {};

const initialLangsHistory =
  gameParams && isRecord
    ? gameParams.players.map(getPlayersText).reduce(setPlayersLangToSliseState, {})
    : {};

const setPlayersResultsToSliceState = (
  state: Record<string, unknown>,
  { userId, ...rest }: { userId: number; [key: string]: unknown },
) => ({
  ...state,
  [userId]: rest,
});

const initialResults = gameParams
  ? gameParams.players.map(getPlayersExecutionData).reduce(setPlayersResultsToSliceState, {})
  : {};

const defaultReportsParams = {
  list: [],
  showOnlyPendingReports: true,
  loading: loadingStatuses.PENDING,
};

const initialReports = { ...defaultReportsParams, ...reportsParams };

const defaultTournamentParams = {
  id: undefined,
  clans: {},
  creator: {},
  grade: '',
  creatorId: null,
  roundsLimit: 3,
  gameResults: {},
  insertedAt: null,
  isLive: false,
  level: 'elementary',
  matches: {},
  name: '',
  players: {},
  playersCount: 0,
  playersLimit: 128,
  ranking: { entries: [] },
  startsAt: null,
  state: 'loading',
  type: null,
  accessType: 'token',
  accessToken: null,
  currentRoundPosition: null,
  defaultLanguage: 'js',
  lastRoundStartedAt: null,
  matchTimeoutSeconds: 0,
  playedPairIds: [],

  breakState: 'off',
  breakDurationSeconds: 60,

  taskStrategy: 'game',
  taskProvider: 'level',
  taskPackName: null,

  playersPageNumber: 1,
  playersPageSize: 16,
  useChat: false,
  showResults: true,
  showBots: true,

  // client params
  channel: { online: false },
  currentPlayerId: null,
  topPlayerIds: [],
};

const initialTournament = tournamentParams
  ? {
      ...defaultTournamentParams,
      ...tournamentParams,
      channel: { online: !tournamentParams.isLive },
    }
  : defaultTournamentParams;

const initialseasonTournaments = (tournamentsParams as Array<Record<string, unknown>>).filter(
  (x) => x.state === tournamentStates.upcoming,
);
const initialLiveTournaments = (tournamentsParams as Array<Record<string, unknown>>).filter(
  (x) => x.isLive,
);
const initialCompletedTournaments = (tournamentsParams as Array<Record<string, unknown>>).filter(
  (x) => !x.isLive,
);

const defaultTournamentPlayerParams = {
  tournamentId,
  playerId,
  gameId: null,
  user: null,
  channel: { online: false },
};

// ******************************
//
// Stage 4: Combine all slices data
//
// ******************************

export interface ChannelState {
  online: boolean;
}

export interface Player {
  id: number;
  name: string;
  type?: string;
  isBot?: boolean;
  isGuest?: boolean;
  [key: string]: unknown;
}

export interface GameState {
  id: number | null;
  gameStatus: GameStatusState;
  award: unknown;
  awardStatus: string;
  locked: boolean;
  task: unknown;
  players: Record<number, Player>;
  tournamentsInfo: Record<string, unknown> | null;
  waitType: string | null;
  useChat: boolean;
  alerts: Record<string, unknown>;
  visible?: boolean;
}

export interface LeaderboardState {
  loading: string;
  period: string;
  users: unknown[];
  error: unknown;
}

export interface EventState {
  loading: string;
  [key: string]: unknown;
}

export interface TournamentPlayerState {
  tournamentId: number | null;
  playerId: number | null;
  gameId: number | null;
  user: Player | null;
  channel: ChannelState;
}

export interface ReportsState {
  list: Array<{ id: number; [key: string]: unknown }>;
  showOnlyPendingReports?: boolean;
  loading?: string;
}

export interface SeasonProfileState {
  place: number;
  score: number;
  rating: number;
  [key: string]: unknown;
}

export interface EditorMeta {
  userId?: number;
  currentLangSlug?: string;
  historyCurrentLangSlug?: string;
  editorHeight?: number;
}

export interface EditorState {
  meta: Record<string, EditorMeta>;
  text: Record<string, unknown>;
  textHistory: Record<string, unknown>;
  langs: unknown;
  langsHistory: Record<string, unknown>;
}

export interface ExecutionOutputState {
  results: Record<string, unknown>;
  historyResults: Record<string, unknown>;
}

export interface TournamentAdminState {
  activeGameId: number | null;
}

export interface UserSliceState {
  currentUserId: number | null;
  users: Record<number, Record<string, unknown>>;
  usersStats: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface TournamentState {
  id: number | undefined;
  type: string | null;
  state: string;
  matches: Record<number, Record<string, unknown>>;
  players: Record<number, Record<string, unknown>> | unknown[];
  gameResults: Record<string, unknown>;
  ranking: { entries: Array<{ id: number; [key: string]: unknown }> };
  taskList?: unknown[];
  topPlayerIds: number[];
  playersPageNumber: number;
  channel: ChannelState;
  showBots: boolean;
  creatorId: number | null;
  showResults: boolean;
  [key: string]: unknown;
}

export interface InitialState {
  game: GameState;
  tournament: TournamentState;
  tournamentAdmin: TournamentAdminState;
  tournamentPlayer: TournamentPlayerState;
  tournamentRounds?: unknown;
  editor: EditorState;
  executionOutput: ExecutionOutputState;
  activeGames: unknown[];
  completedGames: unknown[];
  liveTournaments: unknown[];
  seasonTournaments: unknown[];
  completedTournaments: unknown[];
  user: UserSliceState;
  leaderboard: LeaderboardState;
  event: EventState;
  reports: ReportsState;
  seasonProfile: SeasonProfileState;
}

const initialState: InitialState = {
  game: {
    id: null,
    gameStatus: initialGameStatus,
    award: initialGameAward,
    awardStatus: 'idle',
    locked: initialGameLocked,
    task: initialGameTask,
    players: initialPlayers as Record<number, Player>,
    tournamentsInfo: null,
    waitType: null,
    useChat: initialUseChat,
    alerts: {},
  },
  tournament: initialTournament,
  tournamentAdmin: {
    activeGameId: null,
  },
  tournamentPlayer: defaultTournamentPlayerParams,
  editor: {
    meta: initialMeta,
    text: initialText,
    textHistory: isRecord ? initialText : {},
    langs: initialLangs,
    langsHistory: initialLangsHistory,
  },
  executionOutput: {
    results: initialResults,
    historyResults: isRecord ? initialResults : {},
  },
  activeGames: initialActiveGames,
  completedGames: completedGamesParams,
  liveTournaments: initialLiveTournaments,
  seasonTournaments: initialseasonTournaments,
  completedTournaments: initialCompletedTournaments,
  user: {
    currentUserId,
    users: initialUsers,
    usersStats: {},
    settings: {
      ...(currentUserParams || {}),
      mute:
        currentUserParams?.soundSettings?.muted ??
        (currentUserParams?.soundSettings?.type === 'silent' ||
          JSON.parse((localStorage.getItem('ui_mute_sound') || false) as string)),
      alreadySendPremiumRequest: JSON.parse(
        (localStorage.getItem('already_send_premium_request') || false) as string,
      ),
    },
  },
  leaderboard: {
    loading: loadingStatuses.PENDING,
    period: periodTypes.WEEKLY,
    users: initialLeaderboardUsers,
    error: null,
  },
  event: initialEvent,
  reports: initialReports,
  seasonProfile: seasonProfileParams,
};

export default initialState;
