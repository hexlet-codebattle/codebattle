import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys, decamelizeKeys } from 'humps';
import debounce from 'lodash/debounce';
import find from 'lodash/find';

import { makeGameUrl } from '@/utils/urlBuilders';

import socket from '../../socket';
import GameRoomModes from '../config/gameModes';
import GameStateCodes from '../config/gameStateCodes';
import PlaybookStatusCodes from '../config/playbookStatusCodes';
import { taskStateCodes } from '../config/task';
import {
  parse, getFinalState, getText, resolveDiffs,
} from '../lib/player';
import * as selectors from '../selectors';
import { actions, redirectToNewGame } from '../slices';
import {
  taskTemplatesStates, labelTaskParamsWithIds, MAX_NAME_LENGTH, MIN_NAME_LENGTH,
} from '../utils/builder';
import {
  getGamePlayers,
  getGameStatus,
  getPlayersExecutionData,
  getPlayersText,
} from '../utils/gameRoom';
import notification from '../utils/notification';

const defaultLanguages = Gon.getAsset('langs');
const gameId = Gon.getAsset('game_id');
const isRecord = Gon.getAsset('is_record');
const channelName = `game:${gameId}`;
let channel = !isRecord && gameId ? socket.channel(channelName) : null;

export const updateGameChannel = newGameId => {
  const newChannelName = `game:${newGameId}`;
  channel = !isRecord && newGameId ? socket.channel(newChannelName) : null;
};

const initEditors = dispatch => (playbookStatusCode, players) => {
  const isHistory = playbookStatusCode === PlaybookStatusCodes.stored;
  const updateEditorTextAction = isHistory
    ? actions.updateEditorTextHistory
    : actions.updateEditorText;
  const updateExecutionOutputAction = isHistory
    ? actions.updateExecutionOutputHistory
    : actions.updateExecutionOutput;

  players.forEach(player => {
    const editorData = getPlayersText(player);
    const executionOutputData = getPlayersExecutionData(player);

    dispatch(
      updateEditorTextAction(editorData),
    );

    dispatch(
      updateExecutionOutputAction(executionOutputData),
    );
  });
};

const updateStore = dispatch => ({
  firstPlayer,
  secondPlayer,
  task,
  langs,
  gameStatus,
  playbookStatusCode,
}) => {
  const players = getGamePlayers([firstPlayer, secondPlayer]);

  dispatch(actions.setLangs({ langs }));
  dispatch(actions.updateGamePlayers({ players }));

  initEditors(dispatch)(playbookStatusCode, players);

  if (task) {
    dispatch(actions.setGameTask({ task }));
  }

  if (gameStatus) {
    dispatch(actions.updateGameStatus(gameStatus));
  }
};

const initStoredGame = dispatch => data => {
  const mode = GameRoomModes.history;

  const gameStatus = {
    state: GameStateCodes.stored,
    type: data.type,
    mode,
    tournamentId: data.tournamentId,
  };

  updateStore(dispatch)({
    firstPlayer: data.players[0],
    secondPlayer: data.players[1],
    task: data.task,
    gameStatus,
    playbookStatusCode: PlaybookStatusCodes.stored,
  });

  dispatch(actions.loadPlaybook(data));
  dispatch(actions.updateChatData(data.chat));
};

const initPlaybook = dispatch => data => {
  initEditors(dispatch)(PlaybookStatusCodes.stored, data.players);

  dispatch(actions.loadPlaybook(data));
};

const initGameChannel = (dispatch, machine, currentChannel) => {
  const onJoinFailure = payload => {
    machine.send('REJECT_LOADING_GAME', { payload });
    machine.send('FAILURE_JOIN', { payload });
    window.location.reload();
  };

  currentChannel.onError(() => {
    machine.send('FAILURE');
  });

  currentChannel.onMessage = (_event, payload) => camelizeKeys(payload);

  const onJoinSuccess = response => {
    if (response.error) {
      console.error(response.error);
      return;
    }

    const {
      game: {
        players: [firstPlayer, secondPlayer],
        task,
        langs,
      },
    } = response;

    const gameStatus = getGameStatus(response.game);

    machine.send('LOAD_GAME', { payload: gameStatus });

    updateStore(dispatch)({
      firstPlayer,
      secondPlayer,
      task,
      langs,
      gameStatus,
      playbookStatusCode: PlaybookStatusCodes.active,
    });
  };

  currentChannel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);
};

export const updateEditorText = (editorText, langSlug = null) => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(state)(userId);
  dispatch(actions.updateEditorText({ userId, editorText, langSlug: currentLangSlug }));
};

export const sendEditorText = (editorText, langSlug = null) => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(state)(userId);

  dispatch(actions.updateEditorText({ userId, editorText, langSlug: currentLangSlug }));

  channel.push('editor:data', {
    editor_text: editorText,
    lang_slug: currentLangSlug,
  });
};

export const sendEditorCursorPosition = offset => {
  channel.push('editor:cursor_position', { offset });
};

export const sendEditorCursorSelection = (startOffset, endOffset) => {
  channel.push('editor:cursor_selection', {
    start_offset: startOffset,
    end_offset: endOffset,
  });
};

export const sendGiveUp = () => {
  channel.push('give_up', {});
};

export const sendOfferToRematch = () => {
  channel.push('rematch:send_offer', {});
};

export const sendRejectToRematch = () => {
  channel.push('rematch:reject_offer', {});
};

export const sendAcceptToRematch = () => {
  channel.push('rematch:accept_offer', {});
};

export const sendEditorLang = currentLangSlug => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);

  dispatch(actions.updateEditorLang({ userId, currentLangSlug }));
};

export const updateCurrentLangAndSetTemplate = langSlug => (dispatch, getState) => {
  const state = getState();
  const langs = selectors.editorLangsSelector(state) || defaultLanguages;
  const currentText = selectors.currentPlayerTextByLangSelector(langSlug)(state);
  const { solutionTemplate: template } = find(langs, { slug: langSlug });
  const textToSet = currentText || template;
  dispatch(updateEditorText(textToSet, langSlug));
};

export const sendCurrentLangAndSetTemplate = langSlug => (dispatch, getState) => {
  const state = getState();
  const langs = selectors.editorLangsSelector(state) || defaultLanguages;
  const currentText = selectors.currentPlayerTextByLangSelector(langSlug)(state);
  const { solutionTemplate: template } = find(langs, { slug: langSlug });
  const textToSet = currentText || template;
  dispatch(sendEditorText(textToSet, langSlug));
};

export const resetTextToTemplate = langSlug => (dispatch, getState) => {
  const state = getState();
  const langs = selectors.editorLangsSelector(state) || defaultLanguages;
  const { solutionTemplate: template } = find(langs, { slug: langSlug });
  dispatch(updateEditorText(template, langSlug));
};

export const resetTextToTemplateAndSend = langSlug => (dispatch, getState) => {
  const state = getState();
  const langs = selectors.editorLangsSelector(state) || defaultLanguages;
  const { solutionTemplate: template } = find(langs, { slug: langSlug });
  dispatch(sendEditorText(template, langSlug));
};

export const soundNotification = notification();

export const addCursorListeners = (id, onChangePosition, onChangeSelection) => {
  if (!id) {
    return () => { };
  }

  const oldChannel = channel;

  const handleNewCursorPosition = debounce(data => {
    const { userId, offset } = data;
    if (id === userId) {
      onChangePosition(offset);
    }
  }, 80);

  const handleNewCursorSelection = debounce(data => {
    const { userId, startOffset, endOffset } = data;
    if (id === userId) {
      onChangeSelection(startOffset, endOffset);
    }
  }, 200);

  const refs = [
    oldChannel.on('editor:cursor_position', handleNewCursorPosition),
    oldChannel.on('editor:cursor_selection', handleNewCursorSelection),
  ];

  const clearCursorListeners = () => {
    if (oldChannel) {
      oldChannel.off('editor:cursor_position', refs[0]);
      oldChannel.off('editor:cursor_selection', refs[1]);
    }
  };

  return clearCursorListeners;
};

export const activeEditorReady = machine => {
  machine.send('load_active_editor');
  // channel.on('editor:data', data => {
  //   const { userId } = data;
  //   machine.send('typing', { userId });
  // });

  const handleStartsCheck = data => {
    const { userId } = data;
    machine.send('check_solution', { userId });
  };

  const handleNewCheckResult = data => {
    const { userId } = data;
    machine.send('receive_check_result', { userId });
  };

  const refs = [
    channel.on('user:start_check', handleStartsCheck),
    channel.on('user:check_complete', handleNewCheckResult),
  ];

  const oldChannel = channel;

  const clearEditorListeners = () => {
    machine.send('unload_editor');

    if (oldChannel) {
      oldChannel.off('user:start_check', refs[0]);
      oldChannel.off('user:check_complete', refs[1]);
    }
  };

  return clearEditorListeners;
};

export const activeGameReady = (machine, { cancelRedirect = false }) => dispatch => {
  const currentGameChannel = channel;
  initGameChannel(dispatch, machine, currentGameChannel);

  const handleNewEditorData = data => {
    dispatch(actions.updateEditorText(data));
  };

  const handleStartsCheck = ({ user_id: userId }) => {
    dispatch(actions.updateCheckStatus({ [userId]: true }));
  };

  const handleNewCheckResult = responseData => {
    const {
      state, solutionStatus, checkResult, players, userId,
    } = responseData;
    if (solutionStatus) {
      channel.push('game:score', {})
        .receive('ok', data => dispatch(actions.setGameScore(data)));
    }
    dispatch(actions.updateGamePlayers({ players }));

    dispatch(
      actions.updateExecutionOutput({
        ...checkResult,
        userId,
      }),
    );
    dispatch(actions.updateGameStatus({ state, solutionStatus }));
    dispatch(actions.updateCheckStatus({ [userId]: false }));

    const payload = { state };
    machine.send('user:check_complete', { payload });
  };

  const handleUserJoined = data => {
    const {
      state,
      startsAt,
      timeoutSeconds,
      langs,
      players,
      task,
    } = data;

    const gamePlayers = getGamePlayers(players);
    const [firstPlayer, secondPlayer] = gamePlayers;

    soundNotification.start();
    dispatch(actions.updateGamePlayers({ players: gamePlayers }));
    dispatch(actions.setGameTask({ task }));
    dispatch(actions.setLangs({ langs }));

    dispatch(
      actions.updateEditorText({
        userId: firstPlayer.id,
        editorText: firstPlayer.editorText,
        langSlug: firstPlayer.editorLang,
      }),
    );

    dispatch(
      actions.updateExecutionOutput({
        ...firstPlayer.checkResult,
        userId: firstPlayer.id,
      }),
    );

    if (secondPlayer) {
      dispatch(
        actions.updateEditorText({
          userId: secondPlayer.id,
          editorText: secondPlayer.editorText,
          langSlug: secondPlayer.editorLang,
        }),
      );

      dispatch(
        actions.updateExecutionOutput({
          ...secondPlayer.checkResult,
          userId: secondPlayer.id,
        }),
      );
    }

    dispatch(
      actions.updateGameStatus({
        state,
        startsAt,
        timeoutSeconds,
      }),
    );
    machine.send('game:user_joined', { payload: data });
  };

  const handleUserWon = data => {
    const { players, state, msg } = data;
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ state, msg }));
    machine.send('user:won', { payload: data });
  };

  const handleUserGiveUp = data => {
    const { players, state, msg } = data;
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ state, msg }));
    channel.push('game:score', {})
      .receive('ok', response => dispatch(actions.setGameScore(response)));
    machine.send('user:give_up', { payload: data });
  };

  const handleRematchStatusUpdate = data => {
    dispatch(actions.updateRematchStatus(data));
    machine.send('rematch:status_updated', { payload: data });
  };

  const handleRematchAccepted = ({ game_id: newGameId }) => {
    machine.send('rematch:accepted', { newGameId });
    redirectToNewGame(newGameId);
  };

  const handleGameTimeout = data => {
    const { gameState } = data;
    const payload = { state: gameState };
    dispatch(actions.updateGameStatus(payload));
    machine.send('game:timeout', { payload });
  };

  const handleTournamentGameCreated = data => {
    dispatch(actions.setTournamentsInfo(data));
    machine.send('tournament:game:created', { payload: data });
    if (!cancelRedirect) {
      setTimeout(
        () => { window.location.replace(makeGameUrl(data.gameId)); },
        10,
      );
    }
  };

  const handleTournamentRoundCreated = response => {
    dispatch(actions.updateTournamentData(response));
  };

  const handleTournamentRoundFinished = response => {
    dispatch(actions.updateTournamentData({ state: response.state, breakState: response.breakState }));
    dispatch(actions.updateTournamentMatches(response.matches));
  };

  const handleTournamentGameWait = response => {
    dispatch(actions.setTournamentWaitType(response.type));
  };

  const refs = [
    currentGameChannel.on('editor:data', handleNewEditorData),
    currentGameChannel.on('user:start_check', handleStartsCheck),
    currentGameChannel.on('user:check_complete', handleNewCheckResult),
    currentGameChannel.on('user:won', handleUserWon),
    currentGameChannel.on('user:give_up', handleUserGiveUp),
    currentGameChannel.on('rematch:status_updated', handleRematchStatusUpdate),
    currentGameChannel.on('rematch:accepted', handleRematchAccepted),
    currentGameChannel.on('game:user_joined', handleUserJoined),
    currentGameChannel.on('game:timeout', handleGameTimeout),
    currentGameChannel.on('tournament:game:created', handleTournamentGameCreated),
    currentGameChannel.on('tournament:round_created', handleTournamentRoundCreated),
    currentGameChannel.on('tournament:round_finished', handleTournamentRoundFinished),
    currentGameChannel.on('tournament:game:wait', handleTournamentGameWait),
  ];

  const clearGameListeners = () => {
    if (currentGameChannel) {
      currentGameChannel.off('editor:data', refs[0]);
      currentGameChannel.off('user:start_check', refs[1]);
      currentGameChannel.off('user:check_complete', refs[2]);
      currentGameChannel.off('user:won', refs[3]);
      currentGameChannel.off('user:give_up', refs[4]);
      currentGameChannel.off('rematch:status_updated', refs[5]);
      currentGameChannel.off('rematch:accepted', refs[6]);
      currentGameChannel.off('game:user_joined', refs[7]);
      currentGameChannel.off('game:timeout', refs[8]);
      currentGameChannel.off('tournament:game:created', refs[9]);
      currentGameChannel.off('tournament:round_created', refs[10]);
      currentGameChannel.off('tournament:round_finished', refs[11]);
      currentGameChannel.off('tournament:game:wait', refs[12]);
    }
  };

  return clearGameListeners;
};

const fetchOrCreateTask = (gameMachine, taskMachine) => (dispatch, getState) => {
  const currentTask = getState().builder.task;

  taskMachine.send('SETUP_TASK', { payload: currentTask });

  const state = GameStateCodes.builder;
  const message = { payload: { state } };
  gameMachine.send('LOAD_GAME', message);
};

export const reloadGeneratorAndSolutionTemplates = taskMachine => (dispatch, getState) => {
  const state = getState();

  const langs = selectors.editorLangsSelector(state);

  const solution = langs.reduce(
    (acc, lang) => (
      lang.argumentsGeneratorTemplate
        ? { ...acc, [lang.slug]: lang.solutionTemplate }
        : acc
    ),
    {},
  );
  const argumentsGenerator = langs.reduce(
    (acc, lang) => (
      lang.argumentsGeneratorTemplate
        ? { ...acc, [lang.slug]: lang.argumentsGeneratorTemplate }
        : acc
    ),
    {},
  );

  dispatch(actions.setTaskTemplates({ solution, argumentsGenerator }));
  taskMachine.send('CHANGES');
};

export const validateTaskName = name => (dispatch, getState) => {
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    return;
  }

  axios
    .get(`/api/v1/tasks/${name}/unique`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(response => {
      const data = camelizeKeys(response.data);
      const { name: currentTaskName } = selectors.builderTaskSelector(getState());

      if (currentTaskName !== name) {
        return;
      }

      if (data.unique) {
        dispatch(actions.setValidationStatuses({ name: [true] }));
      } else {
        dispatch(actions.setValidationStatuses({ name: [false, 'Name must be unique'] }));
      }
    })
    .catch(error => {
      dispatch(actions.setValidationStatuses({ name: [false, error.message] }));
    });
};

export const updateTaskState = (id, state) => dispatch => {
  axios
    .patch(`/api/v1/tasks/${id}`, { task: { state } }, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(() => {
      dispatch(actions.setTaskState(state));
    })
    .catch(error => {
      dispatch(actions.setError(error));
      console.error(error);
    });
};

export const publishTask = id => (dispatch, getState) => {
  const state = getState();
  const isAdmin = selectors.currentUserIsAdminSelector(state);
  const nextTaskState = isAdmin
    ? taskStateCodes.active
    : taskStateCodes.moderation;

  dispatch(updateTaskState(id, nextTaskState));
};

export const updateTaskVisibility = (id, visibility, onError) => dispatch => {
  axios
    .patch(`/api/v1/tasks/${id}`, { task: { visibility } }, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(() => {
      dispatch(actions.setTaskVisibility(visibility));
    })
    .catch(error => {
      dispatch(actions.setError(error));
      console.error(error);
      onError(error);
    });
};

export const saveTask = (taskMachine, onError) => (dispatch, getState) => {
  const state = getState();

  const taskParams = selectors.taskParamsSelector()(state);
  const payload = { task: decamelizeKeys(taskParams, { separator: '_' }) };

  if (taskParams.state === taskStateCodes.blank) {
    axios
      .post('/api/v1/tasks', payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      })
      .then(response => {
        const data = camelizeKeys(response.data);

        taskMachine.send('CONFIRM');
        window.location.href = `/tasks/${data.task.id}`;
      })
      .catch(err => {
        onError(err);

        dispatch(actions.setError(err));
        console.error(err);
      });
  } else {
    axios
      .patch(`/api/v1/tasks/${taskParams.id}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      })
      .then(data => {
        const labledTask = labelTaskParamsWithIds(data.task);

        dispatch(actions.setTask({ task: labledTask }));
        taskMachine.send('CONFIRM');
      })
      .catch(err => {
        onError(err);

        dispatch(actions.setError(err));
        console.error(err);
      });
  }
};

export const deleteTask = id => dispatch => {
  axios
    .delete(`/api/v1/tasks/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(() => {
      window.location.href = '/tasks';
    })
    .catch(err => {
      dispatch(actions.setError(err));
      console.error(err);
    });
};

export const buildTaskAsserts = taskMachine => (dispatch, getState) => {
  const state = getState();

  if (state.builder.templates.state !== taskTemplatesStates.init) {
    dispatch(actions.setTaskAsserts({
      asserts: state.builder.task.assertsExamples.map(({ arguments: args, expected }) => ({
        arguments: JSON.parse(args),
        expected: JSON.parse(expected),
      })),
      status: 'ok',
    }));

    taskMachine.send('SUCCESS');
    return;
  }

  const taskParams = selectors.taskParamsSelector({ normalize: false })(state);
  const editorLang = selectors.taskGeneratorLangSelector(state);
  const textSolution = selectors.taskSolutionSelector(state, editorLang);
  const textArgumentsGenerator = selectors.taskArgumentsGeneratorSelector(state, editorLang);

  axios
    .post('/api/v1/tasks/build', {
      task: decamelizeKeys(taskParams, { separator: '_' }),
      arguments_generator_text: textArgumentsGenerator,
      solution_text: textSolution,
      editor_lang: editorLang,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(response => {
      const data = camelizeKeys(response.data);

      dispatch(actions.setTaskAsserts({
        asserts: data.asserts || [],
        status: data.status,
        output: data.message,
      }));

      switch (data.status) {
        case 'ok': {
          taskMachine.send('SUCCESS');
          break;
        }
        case 'failure':
          taskMachine.send('FAILURE', { message: "Actual values doesn't match with expected values" });
          break;
        case 'error': {
          taskMachine.send('ERROR', { message: data.message });
          break;
        }
        default: {
          taskMachine.send('ERROR', { message: data.message || 'Something Wrong' });
        }
      }
    })
    .catch(err => {
      dispatch(actions.setTaskAsserts({
        asserts: [],
        status: 'error',
        output: err.message,
      }));
      taskMachine.send('ERROR', { message: err.message });

      dispatch(actions.setError(err));
      console.error(err);
    });
};

const fetchPlaybook = (machine, init) => dispatch => {
  axios
    .get(`/api/v1/playbook/${gameId}`)
    .then(response => {
      const data = camelizeKeys(response.data);
      const type = isRecord
        ? PlaybookStatusCodes.stored
        : PlaybookStatusCodes.active;
      const resolvedData = resolveDiffs(data, type);

      init(dispatch)(resolvedData);

      machine.send('LOAD_PLAYBOOK', { payload: resolvedData });
    })
    .catch(err => {
      console.error(err);
      dispatch(actions.setError(err));
      machine.send('REJECT_LOADING_PLAYBOOK', { payload: err });
    });

  return () => { };
};

export const changePlaybookSolution = method => dispatch => {
  axios.post(`/api/v1/playbooks/${method}`, {
    game_id: gameId,
  }, {
    headers: {
      'Content-type': 'application/json',
      'x-csrf-token': window.csrf_token,
    },
  }).then(response => {
    const data = camelizeKeys(response.data);

    if (data.errors) {
      console.error(data.errors);
      dispatch(actions.setError({
        message: data.errors[0],
      }));
    } else {
      dispatch(actions.changeSolutionType(data));
    }
  }).catch(error => {
    console.error(error);
    dispatch(actions.setError(error));
  });
};

export const storedEditorReady = machine => {
  machine.send('load_stored_editor');

  return () => { };
};

export const downloadPlaybook = machine => dispatch => {
  dispatch(fetchPlaybook(machine, initPlaybook));
};

export const openPlaybook = machine => () => {
  machine.send('OPEN_REPLAYER');
};

export const connectToTask = (gameMachine, taskMachine) => dispatch => {
  dispatch(fetchOrCreateTask(gameMachine, taskMachine));

  return () => { };
};

export const connectToGame = (machine, options) => dispatch => {
  if (isRecord) {
    return fetchPlaybook(machine, initStoredGame)(dispatch);
  }

  machine.send('JOIN');

  return activeGameReady(machine, options)(dispatch);
};

export const connectToEditor = machine => () => (
  isRecord
    ? storedEditorReady(machine)
    : activeEditorReady(machine)
);

export const checkGameSolution = () => (dispatch, getState) => {
  const state = getState();
  const currentUserId = selectors.currentUserIdSelector(state);
  const { text, lang } = selectors.getSolution(currentUserId)(state);

  // FIXME: create actions for this state transitions
  // FIXME: create statuses for solutionStatus
  dispatch(actions.updateGameStatus({ solutionStatus: null }));
  dispatch(actions.updateCheckStatus({ [currentUserId]: true }));

  const payload = {
    editor_text: text,
    lang_slug: lang,
  };

  channel.push('check_result', payload);
};

export const checkTaskSolution = editorMachine => (dispatch, getState) => {
  const state = getState();
  const currentUserId = selectors.currentUserIdSelector(state);
  const { text, lang } = selectors.getSolution(currentUserId)(state);
  const task = selectors.builderTaskSelector(state);

  // FIXME: create actions for this state transitions
  // FIXME: create statuses for solutionStatus
  dispatch(actions.updateGameStatus({ solutionStatus: null }));
  dispatch(actions.updateCheckStatus({ [currentUserId]: true }));

  const payload = {
    task: decamelizeKeys(task, { separator: '_' }),
    editor_text: text,
    lang_slug: lang,
  };

  editorMachine.send('user_check_solution');

  axios.post('/api/v1/tasks/check', payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': window.csrf_token,
    },
  }).then(response => {
    const { checkResult } = camelizeKeys(response.data);

    dispatch(
      actions.updateExecutionOutput({
        ...checkResult,
        userId: currentUserId,
      }),
    );
    editorMachine.send('receive_check_result', { userId: currentUserId });
  }).catch(error => {
    dispatch(
      actions.updateExecutionOutput({
        status: 'error',
        outputError: error.message,
        asserts: [],
        version: 2,
        userId: currentUserId,
      }),
    );
    editorMachine.send('receive_check_result', { userId: currentUserId });
  });
};

export const sendReportOnUser = (userId, onSuccess, onError) => dispatch => {
  const payload = { user_id: userId, reason: 'cheat', comment: '' };

  axios
    .post(`/api/v1/games/${gameId}/user_game_reports`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(data => {
      onSuccess(camelizeKeys(data));
    })
    .catch(error => {
      onError(error);

      dispatch(actions.setError(error));
      console.error(error);
    });
};

export const compressEditorHeight = userId => dispatch => dispatch(actions.compressEditorHeight({ userId }));
export const expandEditorHeight = userId => dispatch => dispatch(actions.expandEditorHeight({ userId }));

/*
 * Middleware actions for CodebattlePlayer
*/

export const setGameHistoryState = recordId => (dispatch, getState) => {
  const state = getState();
  const initRecords = selectors.playbookInitRecordsSelector(state);
  const records = selectors.playbookRecordsSelector(state);

  const { players: editorsState, chat: chatState } = getFinalState({
    recordId,
    records,
    initRecords,
  });

  editorsState.forEach(player => {
    dispatch(actions.updateEditorTextHistory({
      userId: player.id,
      editorText: player.editorText,
      langSlug: player.editorLang,
    }));

    dispatch(actions.updateExecutionOutputHistory({
      ...player.checkResult,
      userId: player.id,
    }));
  });

  dispatch(actions.updateChatDataHistory(chatState));
};

export const updateGameHistoryState = nextRecordId => (dispatch, getState) => {
  const state = getState();
  const records = selectors.playbookRecordsSelector(state);
  const nextRecord = parse(records[nextRecordId]) || {};

  switch (nextRecord.type) {
    case 'update_editor_data': {
      const editorText = selectors.editorTextHistorySelector(state, nextRecord);
      const editorLang = selectors.editorLangHistorySelector(state, nextRecord);
      const newEditorText = getText(editorText, nextRecord.diff);

      dispatch(actions.updateEditorTextHistory({
        userId: nextRecord.userId,
        editorText: newEditorText,
        langSlug: nextRecord.diff.nextLang || editorLang,
      }));
      break;
    }
    case 'check_complete':
      dispatch(actions.updateExecutionOutputHistory({
        ...nextRecord.checkResult,
        userId: nextRecord.userId,
      }));
      break;
    case 'chat_message':
    case 'join_chat':
    case 'leave_chat':
      dispatch(actions.updateChatDataHistory(nextRecord.chat));
      break;
    default:
      break;
  }
};
