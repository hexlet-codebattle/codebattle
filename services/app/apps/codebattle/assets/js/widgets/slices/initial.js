import Gon from 'gon';
import { camelizeKeys } from 'humps';

import GameRoomModes from '../config/gameModes';
import GameStateCodes from '../config/gameStateCodes';
import loadingStatuses from '../config/loadingStatuses';
import periodTypes from '../config/periodTypes';
import { taskStateCodes, taskVisibilityCodes } from '../config/task';
import userTypes from '../config/userTypes';
import {
  validateTaskName,
  validateInputSignatures,
  validateExamples,
  taskTemplatesStates,
  labelTaskParamsWithIds,
  getTaskTemplates,
} from '../utils/builder';
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
// Stage 1: get all assets from Gon
//
// ******************************

const activeGamesData = Gon.getAsset('active_games');
const completedGamesData = Gon.getAsset('completed_games');
const currentUserData = Gon.getAsset('current_user');
const gameData = Gon.getAsset('game');
const isRecord = Gon.getAsset('is_record') || false;
const playerId = Gon.getAsset('player_id');
const taskData = Gon.getAsset('task');
const tournamentData = Gon.getAsset('tournament');
const tournamentId = Gon.getAsset('tournament_id');
const tournamentsData = Gon.getAsset('tournaments');
const usersRatingData = Gon.getAsset('users_rating');
const langsData = Gon.getAsset('langs');
const leaderboardUsersData = Gon.getAsset('leaderboard_users');
const eventData = Gon.getAsset('event');

// ******************************
//
// Stage 2: Converting data from elixir naming to javascript
// Example: { "game_params": { "game_id": 10 } } -> { gameParams: { gameId: 10 } }
//
// ******************************

const gameParams = gameData ? camelizeKeys(gameData) : undefined;
const taskParams = taskData ? camelizeKeys(taskData) : undefined;
const tournamentParams = tournamentData
  ? camelizeKeys(tournamentData)
  : undefined;
const completedGamesParams = completedGamesData
  ? camelizeKeys(completedGamesData)
  : [];
const initialActiveGames = activeGamesData ? camelizeKeys(activeGamesData) : [];
const tournamentsParams = tournamentsData ? camelizeKeys(tournamentsData) : [];
const usersRatingParams = usersRatingData ? camelizeKeys(usersRatingData) : [];
const langsParams = langsData ? camelizeKeys(langsData) : [];
const currentUserParams = currentUserData ? camelizeKeys(currentUserData) : undefined;
const currentUserId = currentUserParams ? currentUserParams.id : null;
const initialLeaderboardUsers = leaderboardUsersData ? camelizeKeys(leaderboardUsersData) : [];
const initialEvent = eventData ? {
  ...camelizeKeys(eventData.event),
  tournaments: camelizeKeys(eventData.tournaments),
  topLeaderboard: camelizeKeys(eventData.top_leaderboard),
  loading: loadingStatuses.LOADING,
} : {
  loading: loadingStatuses.LOADING,
};

// TODO: camelizeKeys initialUsers and refactor all selectors/reducers/components
const initialUsers = currentUserParams
  ? {
    [currentUserParams.id]: {
      ...currentUserParams,
      type: userTypes.spectator,
    },
  }
  : {};

// ******************************
//
// Stage 3: Initial data for redux slices
//
// ******************************

export const defaultGameStatusState = {
  state: GameStateCodes.initial,
  msg: '',
  type: null,
  mode: GameRoomModes.none,
  startsAt: null,
  score: null,
  timeoutSeconds: null,
  rematchState: null,
  rematchInitiatorId: null,
  checking: {},
  solutionStatus: null,
};

const initialGameStatus = gameParams
  ? {
    ...defaultGameStatusState,
    ...getGameStatus(gameParams),
  }
  : defaultGameStatusState;

const initialGameAward = gameParams ? gameParams.award : null;

const initialGameLocked = gameParams ? gameParams.locked : false;

const initialGameTask = gameParams ? gameParams.task : null;

const initialUseChat = gameParams ? gameParams.useChat : false;

const initialPlayers = gameParams
  ? getGamePlayers(gameParams.players).reduce(setPlayerToSliceState, {})
  : {};

const initialLangs = gameParams ? gameParams.langs : langsParams;

const setPlayersMetaToSliseState = (state, { userId, langSlug }) => ({
  ...state,
  [userId]: {
    userId,
    currentLangSlug: langSlug,
    historyCurrentLangSlug: langSlug,
  },
});

const setPlayersTextToSliseState = (
  state,
  { userId, editorText, langSlug },
) => ({
  ...state,
  [makeEditorTextKey(userId, langSlug)]: editorText,
});

const setPlayersLangToSliseState = (state, { userId, langSlug }) => ({
  ...state,
  [userId]: langSlug,
});

const initialMeta = gameParams
  ? gameParams.players
    .map(getPlayersText)
    .reduce(setPlayersMetaToSliseState, {})
  : {};

const initialText = gameParams
  ? gameParams.players
    .map(getPlayersText)
    .reduce(setPlayersTextToSliseState, {})
  : {};

const initialLangsHistory = gameParams && isRecord
  ? gameParams.players
    .map(getPlayersText)
    .reduce(setPlayersLangToSliseState, {})
  : {};

const setPlayersResultsToSliceState = (state, { userId, ...rest }) => ({
  ...state,
  [userId]: rest,
});

const initialResults = gameParams
  ? gameParams.players
    .map(getPlayersExecutionData)
    .reduce(setPlayersResultsToSliceState, {})
  : {};

const defaultTaskParams = {
  name: '',
  level: 'elementary',
  state: taskStateCodes.none,
  descriptionEn: '',
  descriptionRu: '',
  inputSignature: [],
  outputSignature: { type: { name: 'integer' } },
  assertsExamples: [],
  asserts: [],
  examples: '',
  solution: '',
  argumentsGenerator: '',
  generatorLang: 'js',
  visibility: taskVisibilityCodes.hidden,
};

const defaultTaskTemplates = {
  state: taskTemplatesStates.loading,
  solution: {},
  argumentsGenerator: {},
};

const defaultTaskAssertsStatus = {
  status: 'none',
  output: '',
};

const defaultValidationStatuses = {
  name: [false],
  description: [false],
  solution: [true],
  argumentsGenerator: [true],
  inputSignature: [false],
  outputSignature: [true],
  assertsExamples: [false],
};

const getTaskValidationStatuses = task => ({
  ...defaultValidationStatuses,
  name: validateTaskName(task.name),
  description: validateTaskName(task.descriptionEn),
  inputSignature: validateInputSignatures(task.inputSignature),
  assertsExamples: validateExamples(task.assertsExamples),
});

const initialTask = taskParams
  ? labelTaskParamsWithIds(taskParams)
  : defaultTaskParams;
const initialTemplates = taskParams
  ? getTaskTemplates(taskParams)
  : defaultTaskTemplates;
const initialAssertsStatus = taskParams
  ? {
    status: taskParams.asserts.length > 0 ? 'ok' : 'none',
    output: '',
  }
  : defaultTaskAssertsStatus;
const initialValidationStatuses = taskParams
  ? getTaskValidationStatuses(taskParams)
  : defaultValidationStatuses;

const defaultTournamentParams = {
  id: null,
  level: 'elementary',
  isLive: false,
  creator: {},
  creatorId: null,
  type: null,
  state: 'loading',
  name: '',
  matches: {},
  gameResults: {},
  players: {},
  playersLimit: 128,
  playersCount: 0,
  startsAt: null,
  insertedAt: null,
  meta: {
    roundsToWin: 3,
    roundsLimit: 3,
    roundsConfigType: 'all',
    roundsConfig: [
      {
        roundTimeoutSeconds: 60,
        taskPackId: null,
        taskLevel: null,
      },
    ],
    teams: [],
  },

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
  playersPageSize: 20,
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

const initialLiveTournaments = tournamentsParams.filter(x => x.isLive);
const initialCompletedTournaments = tournamentsParams.filter(x => !x.isLive);

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

/**
 * @typedef {{
 *  online: boolean,
 * }} ChannelState
 *
 * @typedef {{
 *  avatarUrl: string,
 *  checkResult: Object,
 *  creator: boolean,
 *  durationSec: number,
 *  editorLang: string,
 *  editorText: string,
 *  id: number,
 *  isBot: boolean,
 *  isGuest: boolean,
 *  lang: string,
 *  name: string,
 *  rank: number,
 *  rating: number,
 *  ratingDiff: number,
 *  result: string,
 *  resultPercent: number,
 * }} Player
 * @typedef {{
 *  state: @type {import("../config/gameStateCodes.js").default},
 *  waitingRoomName: string,
 *  msg: string,
 *  type: string,
 *  mode: @type {import("../config/gameModes.js").default},
 *  startsAt: string,
 *  score: Object,
 *  timeoutSeconds: number,
 *  rematchState: string,
 *  rematchInitiatorId: number,
 *  checking: Object,
 *  solutionStatus: {?string},
 * }} GameStatusState
 * @typedef {{
 *  id: number,
 *  name: string,
 *  level: @type {import("../config/levels.js").default},
 *  examples: string,
 *  descriptionRu: {?string},
 *  descriptionEn: {?string},
 *  tags: string[],
 *  state: @type {import("../config/task.js").taskStateCodes},
 *  origin: string,
 *  visibility: @type {import("../config/task.js").taskVisibilityCodes},
 *  creatorId: number,
 *  inputSignature: Object[],
 *  outputSignature: Object,
 *  asserts: Object[],
 *  assertsExamples: Object[],
 *  solution: string,
 *  argumentsGenerator: string,
 *  generatorLang: string,
 * }} TaskState
 * @typedef {{
 *   gameStatus: GameStatusState,
 *   award: {?Object},
 *   awardStatus: string,
 *   locked: boolean,
 *   task: TaskState,
 *   players: Object<number, Player>,
 *   tournamentsInfo: {?Object},
 *   waitType: {?string},
 *   useChat: boolean,
 *   alerts: Object,
 * }} GameState
 * @typedef {{
 *   id: number,
 *   level: @type {import("../config/levels.js").default},
 *   name: string,
 * }} TaskInfo
 * @typedef {{
 *   accessToken: string,
 *   accessType: string,
 *   breakDurationSeconds: number,
 *   breakState: string,
 *   currentRoundPosition: number,
 *   defaultLanguage: string,
 *   description: string,
 *   level: @type {import("../config/levels.js").default},
 *   matchTimeoutSeconds: number,
 *   matches: Object<number, Match>,
 *   lastRoundStartedAt: string,
 *   lastRoundEndedAt: string,
 *   meta: Object,
 *   name: string,
 *   playedPairIds: number[],
 *   players: Object<number, Player>,
 *   taskList: TaskInfo[],
 *   playersCount: number,
 *   playersLimit: number,
 *   startsAt: string,
 *   state: @type {import("../config/tournament.js").default},
 *   taskStrategy: string,
 *   type: string,
 *   useChat: boolean,
 *   showBots: boolean,
 *   showResults: boolean,
 *   waitingRoomName: string,
 *   channel: ChannelState,
 * }} TournamentState
 *
 * @typedef {{
    loading: @type {import("../config/loadingStatuses.js").default},
    period: @type {import("../config/periodTypes.js").default},
    users: Object[],
    error: {?Object},
 * }} LeaderboardState
 * @typedef {{
 *  slug: string,
    type: @type {import("../config/eventTypes.js").default},
    loading: @type {import("../config/loadingStatuses.js").default},
    tournaments: TournamentState[]
    topLeaderboard: Object[],
    commonLeaderboard: Object[],
    title: string,
    description: string,
    startsAt: string,
 * }} EventState
 *
 * @typedef {{
 *   gameId: {?number},
 *   playerId: {?number},
 *   tournamentId: {?number},
 *   user: {?Player},
 *   channel: ChannelState,
 * }} TournamentPlayerState
 *
 * @const {{
 *   game: GameState,
 *   event: EventState,
 *   tournament: TournamentState,
 *   tournamentPlayer: TournamentPlayerState,
 *   editor: Object,
 *   executionOutput: Object,
 *   builder: Object,
 *   activeGames: Object,
 *   completedGames: Object,
 *   liveTournaments: Object,
 *   completedTournaments: Object,
 *   user: Object,
 *   leaderboard: LeaderboardState,
 * }}
 *
 */
export default {
  game: {
    gameStatus: initialGameStatus,
    award: initialGameAward,
    awardStatus: 'idle',
    locked: initialGameLocked,
    task: initialGameTask,
    players: initialPlayers,
    tournamentsInfo: null,
    waitType: null,
    useChat: initialUseChat,
    alerts: {},
  },
  tournament: initialTournament,
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
  builder: {
    task: initialTask,
    templates: initialTemplates,
    assertsStatus: initialAssertsStatus,
    validationStatuses: initialValidationStatuses,
    textArgumentsGenerator: initialTemplates.argumentsGenerator,
    textSolution: initialTemplates.solution,
    generatorLang: initialTask.generatorLang,
  },
  activeGames: initialActiveGames,
  completedGames: completedGamesParams,
  liveTournaments: initialLiveTournaments,
  completedTournaments: initialCompletedTournaments,
  user: {
    currentUserId,
    users: initialUsers,
    usersStats: {},
    usersRatingPage: {
      users: usersRatingParams,
      pageInfo: { totalEntries: 0 },
      dateFrom: null,
      withBots: false,
    },
    settings: {
      ...(currentUserParams || {}),
      mute: JSON.parse(localStorage.getItem('ui_mute_sound') || false),
      alreadySendPremiumRequest: JSON.parse(localStorage.getItem('already_send_premium_request') || false),
    },
  },
  leaderboard: {
    loading: loadingStatuses.PENDING,
    period: periodTypes.WEEKLY,
    users: initialLeaderboardUsers,
    error: null,
  },
  event: initialEvent,
};
