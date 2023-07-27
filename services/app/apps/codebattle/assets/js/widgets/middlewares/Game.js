import _ from 'lodash';
import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys, decamelizeKeys } from 'humps';
import socket from '../../socket';
import * as selectors from '../selectors';
import userTypes from '../config/userTypes';
import { actions, redirectToNewGame } from '../slices';
import {
  parse, getFinalState, getText, resolveDiffs,
} from '../lib/player';

import PlaybookStatusCodes from '../config/playbookStatusCodes';
import GameStateCodes from '../config/gameStateCodes';
import GameRoomModes from '../config/gameModes';
import GameTypeCodes from '../config/gameTypeCodes';
import notification from '../utils/notification';
import { taskTemplatesStates, labelTaskParamsWithIds } from '../utils/builder';
import { taskStateCodes } from '../config/task';

const defaultLanguages = Gon.getAsset('langs');
const gameId = Gon.getAsset('game_id');
const taskId = Gon.getAsset('task_id');
const isRecord = Gon.getAsset('is_record');
const channelName = `game:${gameId}`;
const channel = !isRecord ? socket.channel(channelName) : null;

const camelizeKeysAndDispatch = (dispatch, actionCreator) => data => (
  dispatch(actionCreator(camelizeKeys(data)))
);

const initEditors = dispatch => (playbookStatusCode, players) => {
  const isHistory = playbookStatusCode === PlaybookStatusCodes.stored;
  const updateEditorTextAction = isHistory
    ? actions.updateEditorTextHistory
    : actions.updateEditorText;
  const updateExecutionOutputAction = isHistory
    ? actions.updateExecutionOutputHistory
    : actions.updateExecutionOutput;

  players.forEach(player => {
    dispatch(
      updateEditorTextAction({
        userId: player.id,
        editorText: player.editorText,
        langSlug: player.editorLang,
      }),
    );

    dispatch(
      updateExecutionOutputAction({
        ...player.checkResult,
        userId: player.id,
      }),
    );
  });
};

const initStore = dispatch => ({
  firstPlayer,
  secondPlayer,
  task,
  langs,
  gameStatus,
  playbookStatusCode,
}) => {
  const players = [{ ...firstPlayer, type: userTypes.firstPlayer }];

  if (secondPlayer) {
    players.push({ ...secondPlayer, type: userTypes.secondPlayer });
  }

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

  initStore(dispatch)({
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

const initGameChannel = (dispatch, machine) => {
  const onJoinFailure = payload => {
    machine.send('REJECT_LOADING_GAME', { payload });
    machine.send('FAILURE_JOIN', { payload });
    window.location.reload();
  };

  channel.onError(() => {
    machine.send('FAILURE');
  });

  const onJoinSuccess = response => {
    machine.send('JOIN', { payload: response });

    const {
      state,
      startsAt,
      type,
      mode,
      timeoutSeconds,
      players: [firstPlayer, secondPlayer],
      task,
      langs,
      rematchState,
      tournamentId,
      rematchInitiatorId,
      score,
    } = camelizeKeys(response);

    const gameStatus = {
      state,
      type,
      mode,
      startsAt,
      score,
      timeoutSeconds,
      rematchState,
      rematchInitiatorId,
      tournamentId,
    };

    initStore(dispatch)({
      firstPlayer,
      secondPlayer,
      task,
      langs,
      gameStatus,
      playbookStatusCode: PlaybookStatusCodes.active,
    });

    setTimeout(() => {
      const payload = { state };
      machine.send('LOAD_GAME', { payload });
    }, 2000);
  };
  channel
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

export const sendEditorText = (editorText, langSlug = null) => (_dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(state)(userId);
  channel.push('editor:data', {
    editor_text: editorText,
    lang_slug: currentLangSlug,
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
  const { solutionTemplate: template } = _.find(langs, { slug: langSlug });
  const textToSet = currentText || template;
  dispatch(updateEditorText(textToSet, langSlug));
};

export const sendCurrentLangAndSetTemplate = langSlug => (dispatch, getState) => {
  const state = getState();
  const langs = selectors.editorLangsSelector(state) || defaultLanguages;
  const currentText = selectors.currentPlayerTextByLangSelector(langSlug)(state);
  const { solutionTemplate: template } = _.find(langs, { slug: langSlug });
  const textToSet = currentText || template;
  dispatch(sendEditorText(textToSet, langSlug));
};

export const resetTextToTemplate = langSlug => (dispatch, getState) => {
  const state = getState();
  const langs = selectors.editorLangsSelector(state) || defaultLanguages;
  const { solutionTemplate: template } = _.find(langs, { slug: langSlug });
  dispatch(updateEditorText(template, langSlug));
};

export const resetTextToTemplateAndSend = langSlug => (dispatch, getState) => {
  const state = getState();
  const langs = selectors.editorLangsSelector(state) || defaultLanguages;
  const { solutionTemplate: template } = _.find(langs, { slug: langSlug });
  dispatch(sendEditorText(template, langSlug));
};

export const soundNotification = notification();

export const activeEditorReady = machine => () => {
  machine.send('load_active_editor');
  channel.on('editor:data', data => {
    const { userId } = camelizeKeys(data);
    machine.send('typing', { userId });
  });

  channel.on('user:start_check', data => {
    const { userId } = camelizeKeys(data);
    machine.send('check_solution', { userId });
  });

  channel.on('user:check_complete', data => {
    const { userId } = camelizeKeys(data);
    machine.send('receive_check_result', { userId });
  });
};

export const activeGameReady = machine => dispatch => {
  initGameChannel(dispatch, machine);
  channel.on('editor:data', data => {
    dispatch(actions.updateEditorText(camelizeKeys(data)));
  });

  channel.on('user:start_check', ({ user_id: userId }) => {
    dispatch(actions.updateCheckStatus({ [userId]: true }));
  });

  channel.on('user:check_complete', responseData => {
    const {
      state, solutionStatus, checkResult, players, userId,
    } = camelizeKeys(responseData);
    if (solutionStatus) {
      channel.push('game:score', {})
        .receive('ok', camelizeKeysAndDispatch(dispatch, actions.setGameScore));
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
  });

  channel.on('game:user_joined', responseData => {
    const {
      state,
      startsAt,
      timeoutSeconds,
      langs,
      players: [firstPlayer, secondPlayer],
      task,
    } = camelizeKeys(responseData);
    const players = [
      { ...firstPlayer, type: userTypes.firstPlayer },
      { ...secondPlayer, type: userTypes.secondPlayer },
    ];

    soundNotification.start();
    dispatch(actions.updateGamePlayers({ players }));
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
    machine.send('game:user_joined', { payload: camelizeKeys(responseData) });
  });

  channel.on('user:won', data => {
    const { players, state, msg } = camelizeKeys(data);
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ state, msg }));
    machine.send('user:won', { payload: camelizeKeys(data) });
  });

  channel.on('user:give_up', data => {
    const { players, state, msg } = camelizeKeys(data);
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ state, msg }));
    channel.push('game:score', {})
      .receive('ok', camelizeKeysAndDispatch(dispatch, actions.setGameScore));
    machine.send('user:give_up', { payload: camelizeKeys(data) });
  });

  channel.on('rematch:status_updated', payload => {
    const data = camelizeKeys(payload);
    dispatch(actions.updateRematchStatus(data));
    machine.send('rematch:status_updated', { payload: data });
  });

  channel.on('rematch:accepted', ({ game_id: newGameId }) => {
    machine.send('rematch:accepted', { newGameId });
    redirectToNewGame(newGameId);
  });

  channel.on('game:timeout', payload => {
    const { gameState } = camelizeKeys(payload);
    const data = { state: gameState };
    dispatch(actions.updateGameStatus(data));
    machine.send('game:timeout', { payload: data });
  });

  channel.on('tournament:round_created', payload => {
    payload = camelizeKeys(payload);
    dispatch(actions.setTournamentsInfo(payload));
    machine.send('tournament:round_created', { payload });
  });
};

const fetchOrCreateTask = (gameMachine, taskMachine) => dispatch => {
  const requestPath = taskId ? `/api/v1/tasks/${taskId}` : '/api/v1/tasks/new';

  axios.get(requestPath).then(({ data }) => {
    const {
      task,
      langs,
      players,
    } = camelizeKeys(data);
    const state = GameStateCodes.builder;

    const type = GameTypeCodes.duo;
    const mode = GameRoomModes.builder;
    const timeoutSeconds = 0;

    const gameStatus = {
      state,
      type,
      mode,
      timeoutSeconds,
    };

    initStore(dispatch)({
      firstPlayer: players[0],
      secondPlayer: players[1],
      langs,
      gameStatus,
      playbookStatusCode: PlaybookStatusCodes.none,
    });

    const labeledTask = labelTaskParamsWithIds(task);

    dispatch(actions.setTask({ task: labeledTask }));

    taskMachine.send('SETUP_TASK', { payload: task });

    const message = { payload: { state } };
    gameMachine.send('LOAD_GAME', message);
  });
};

export const fetchGeneratorAndSolutionTemplates = taskMachine => (dispatch, getState) => {
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

export const validateTaskName = name => dispatch => {
  axios
    .get(`/api/v1/tasks/${name}/unique`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(response => {
      const data = camelizeKeys(response.data);

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

export const saveTask = (taskMachine, onError) => (dispatch, getState) => {
  const state = getState();

  const taskParams = selectors.taskParamsSelector(state);
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
      .then(response => {
        const data = camelizeKeys(response.data);
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
    }));

    taskMachine.send('SUCCESS');
    return;
  }

  const taskParams = selectors.taskParamsSelector(state);
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

      dispatch(actions.setTaskAsserts({ asserts: data.asserts || [] }));

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
        default:
          throw new Error(`Invalid status ${data.status} (/api/v1/tasks/build)`);
      }
    })
    .catch(err => {
      dispatch(actions.setTaskAsserts({ asserts: [] }));
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
      dispatch(actions.setError(err));
      machine.send('REJECT_LOADING_PLAYBOOK', { payload: err });

      console.error(err);
    });
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

export const storedEditorReady = machine => () => {
  machine.send('load_stored_editor');
};

export const downloadPlaybook = machine => dispatch => {
  dispatch(fetchPlaybook(machine, initPlaybook));
};

export const openPlaybook = machine => () => {
  machine.send('OPEN_REPLAYER');
};

export const connectToTask = (gameMachine, taskMachine) => dispatch => {
  dispatch(fetchOrCreateTask(gameMachine, taskMachine));
};

export const connectToGame = machine => dispatch => {
  dispatch(isRecord ? fetchPlaybook(machine, initStoredGame) : activeGameReady(machine));
};

export const connectToEditor = machine => dispatch => {
  dispatch(isRecord ? storedEditorReady(machine) : activeEditorReady(machine));
};

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
