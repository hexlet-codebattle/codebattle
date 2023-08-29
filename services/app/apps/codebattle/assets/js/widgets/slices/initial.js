import { camelizeKeys } from 'humps';
import Gon from 'gon';
import { taskStateCodes, taskVisibilityCodes } from '../config/task';
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
import GameStateCodes from '../config/gameStateCodes';
import GameRoomModes from '../config/gameModes';
import userTypes from '../config/userTypes';

const currentUserParams = Gon.getAsset('current_user');
const isRecord = Gon.getAsset('is_record') || false;
const gameData = Gon.getAsset('game');
const taskData = Gon.getAsset('task');
const tournamentData = Gon.getAsset('tournament');
const completedGamesData = Gon.getAsset('completed_games');
const activeGamesData = Gon.getAsset('active_games');
const tournamentsData = Gon.getAsset('tournaments');
const usersRatingData = Gon.getAsset('users_rating');

const gameParams = gameData ? camelizeKeys(gameData) : undefined;
const taskParams = taskData ? camelizeKeys(taskData) : undefined;
const tournamentParams = tournamentData ? camelizeKeys(tournamentData) : undefined;
const completedGamesParams = completedGamesData
  ? camelizeKeys(completedGamesData)
  : [];
const activeGamesParams = activeGamesData
  ? camelizeKeys(activeGamesData)
  : [];
const tournamentsParams = tournamentsData
  ? camelizeKeys(tournamentsData)
  : [];
const usersRatingParams = usersRatingData
  ? camelizeKeys(usersRatingData)
  : [];
const currentUserId = currentUserParams ? currentUserParams.id : null;
const initialUsers = currentUserParams
  ? { [currentUserParams.id]: { ...currentUserParams, type: userTypes.spectator } }
  : {};

const defaultGameStatusState = {
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

const initialGameTask = gameParams
  ? gameParams.task
  : null;

const initialPlayers = gameParams
  ? getGamePlayers(gameParams.players)
    .reduce(setPlayerToSliceState, {})
  : {};

const initialLangs = gameParams
  ? gameParams.langs
  : [];

const setPlayersMetaToSliseState = (state, { userId, langSlug }) => ({
  ...state,
  [userId]: { userId, currentLangSlug: langSlug, historyCurrentLangSlug: langSlug },
});

const setPlayersTextToSliseState = (state, { userId, editorText, langSlug }) => ({
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

const defaultTaskParams = ({
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
});

const defaultTaskTemplates = {
  state: taskTemplatesStates.loading,
  solution: {},
  argumentsGenerator: {},
};

const defaultTaskAssertsStatus = {
  status: 'none',
  output: '',
};

const defaultValidationStatuses = ({
  name: [false],
  description: [false],
  solution: [true],
  argumentsGenerator: [true],
  inputSignature: [false],
  outputSignature: [true],
  assertsExamples: [false],
});

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
  ? getTaskTemplates(taskData)
  : defaultTaskTemplates;
const initialAssertsStatus = taskParams
  ? taskData
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
  players: {},
  playersLimit: 128,
  playersCount: 0,
  startsAt: null,
  insertedAt: null,
  meta: {},

  accessType: 'token',
  accessToken: null,
  currentRound: null,
  defaultLanguage: 'js',
  lastRoundStartedAt: null,
  matchTimeoutSeconds: 0,
  playedPairIds: [],

  taskStrategy: 'game',
  taskProvider: 'level',

  channel: { online: false },
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

const initial = {
  game: {
    gameStatus: initialGameStatus,
    task: initialGameTask,
    players: initialPlayers,
    tournamentsInfo: null,
    alerts: {},
  },
  tournament: initialTournament,
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
  activeGames: activeGamesParams,
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
  },
};

export default initial;
