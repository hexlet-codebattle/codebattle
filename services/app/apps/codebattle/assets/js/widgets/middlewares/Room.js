import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys, decamelizeKeys } from 'humps';
import debounce from 'lodash/debounce';
import find from 'lodash/find';

import { makeGameUrl } from '@/utils/urlBuilders';

import { channelMethods, channelTopics } from '../../socket';
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
  taskTemplatesStates,
  labelTaskParamsWithIds,
  MAX_NAME_LENGTH,
  MIN_NAME_LENGTH,
} from '../utils/builder';
import {
  getGamePlayers,
  getGameStatus,
  getPlayersExecutionData,
  getPlayersText,
} from '../utils/gameRoom';
import notification from '../utils/notification';

import Channel from './Channel';
import { addWaitingRoomListeners } from './WaitingRoom';

const defaultLanguages = Gon.getAsset('langs');
const gameId = Gon.getAsset('game_id');
const isRecord = Gon.getAsset('is_record');
const channel = new Channel();

export const setGameChannel = (newGameId = gameId) => {
  const newChannelName = `game:${newGameId}`;
  return channel.setupChannel(!isRecord && newGameId ? newChannelName : undefined);
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

    dispatch(updateEditorTextAction(editorData));

    dispatch(updateExecutionOutputAction(executionOutputData));
  });
};

const updateStore = dispatch => ({
  firstPlayer,
  secondPlayer,
  task,
  langs,
  gameStatus,
  playbookStatusCode,
  award,
  visible,
  locked,
}) => {
  const players = getGamePlayers([firstPlayer, secondPlayer]);

  dispatch(actions.setAward(award));
  dispatch(actions.setVisible(visible));
  dispatch(actions.setLocked(locked));

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
    locked: data.locked,
    visible: true,
    award: data.award,
    awardStatus: 'idle',
    playbookStatusCode: PlaybookStatusCodes.stored,
  });

  dispatch(actions.loadPlaybook(data));
  dispatch(actions.updateChatData(data.chat));
};

const initPlaybook = dispatch => data => {
  initEditors(dispatch)(PlaybookStatusCodes.stored, data.players);

  dispatch(actions.loadPlaybook(data));
};

const initGameChannel = (gameRoomService, waitingRoomService) => dispatch => {
  const onJoinFailure = payload => {
    gameRoomService.send('REJECT_LOADING_GAME', { payload });
    gameRoomService.send('FAILURE_JOIN', { payload });
    window.location.reload();
  };

  channel.onError(() => {
    gameRoomService.send('FAILURE');
  });

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
        locked,
        waitingRoomName,
        award,
      },
      activeGameId,
      tournament,
      currentPlayer,
    } = response;

    const gameStatus = getGameStatus(response.game);

    gameRoomService.send('LOAD_GAME', { payload: gameStatus });

    if (waitingRoomName && currentPlayer) {
      waitingRoomService.send('LOAD_WAITING_ROOM', {
        payload: { currentPlayer },
      });
      dispatch(actions.setActiveTournamentPlayer(currentPlayer));
    }

    if (activeGameId) {
      dispatch(actions.setActiveGameId({ activeGameId }));
    }

    if (tournament) {
      dispatch(
        actions.setTournamentData({
          ...tournament,
          matches: {},
          players: {},
        }),
      );
    }

    updateStore(dispatch)({
      firstPlayer,
      secondPlayer,
      task,
      langs,
      gameStatus,
      award,
      visible: true,
      locked,
      playbookStatusCode: PlaybookStatusCodes.active,
    });
  };

  channel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);
};

export const updateEditorText = (editorText, langSlug = null) => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(userId)(state);
  dispatch(
    actions.updateEditorText({
      userId,
      editorText,
      langSlug: currentLangSlug,
    }),
  );
};

export const sendEditorLang = langSlug => (_dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(userId)(state);

  channel.push(channelMethods.editorLang, {
    langSlug: currentLangSlug,
  });
};

export const sendEditorText = (editorText, langSlug = null) => (_dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(userId)(state);

  channel.push(channelMethods.editorData, {
    editorText,
    langSlug: currentLangSlug,
  });
};

// TODO: only for show tournament
export const startRoundTournament = () => {
  channel
    .push('tournament:start_round', {})
    .receive('error', error => console.error(error));
};

export const sendEditorCursorPosition = offset => {
  channel.push(channelMethods.editorCursorPosition, { offset });
};

export const sendEditorCursorSelection = (startOffset, endOffset) => {
  channel.push(channelMethods.editorCursorSelection, {
    startOffset,
    endOffset,
  });
};

export const sendPassCode = (passCode, onError) => dispatch => {
  channel
    .push(channelMethods.enterPassCode, { passCode })
    .receive('ok', () => {
      dispatch(actions.setLocked(false));
    })
    .receive('error', error => {
      onError({ message: error.reason });
    });
};

export const sendGiveUp = () => {
  channel.push(channelMethods.giveUp, {});
};

export const sendOfferToRematch = () => {
  channel.push(channelMethods.rematchSendOffer, {});
};

export const sendRejectToRematch = () => {
  channel.push(channelMethods.rematchRejectOffer, {});
};

export const sendAcceptToRematch = () => {
  channel.push(channelMethods.rematchAcceptOffer, {});
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

  const userId = selectors.currentUserIdSelector(state);
  const newLangSlug = langSlug || selectors.userLangSelector(userId)(state);

  dispatch(
    actions.updateEditorText({
      userId,
      editorText: textToSet,
      langSlug: newLangSlug,
    }),
  );

  dispatch(sendEditorText(textToSet, langSlug));
  dispatch(sendEditorLang(langSlug));
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
  dispatch(updateEditorText(template, langSlug));
  dispatch(sendEditorText(template, langSlug));
};

export const soundNotification = notification();

export const addCursorListeners = (params, onChangePosition, onChangeSelection) => {
  const {
    roomMode,
    userId,
  } = params;

  const isBuilder = roomMode === GameRoomModes.builder;
  const isHistory = roomMode === GameRoomModes.history;

  const canReceivedRemoteCursor = !isBuilder && !isHistory && !!userId && !isRecord;

  if (!canReceivedRemoteCursor) {
    return () => { };
  }

  const handleNewCursorPosition = debounce(data => {
    const { offset } = data;
    if (userId === data.userId) {
      onChangePosition(offset);
    }
  }, 80);

  const handleNewCursorSelection = debounce(data => {
    const { startOffset, endOffset } = data;
    if (userId === data.userId) {
      onChangeSelection(startOffset, endOffset);
    }
  }, 200);

  const listenerParams = { userId };

  channel
    .addListener(
      channelTopics.editorCursorPositionTopic,
      handleNewCursorPosition,
      listenerParams,
    )
    .addListener(
      channelTopics.editorCursorSelectionTopic,
      handleNewCursorSelection,
      listenerParams,
    );

  return () => {
    if (channel) {
      channel
        .removeListeners(
          channelTopics.editorCursorPositionTopic,
          listenerParams,
        )
        .removeListeners(
          channelTopics.editorCursorSelectionTopic,
          listenerParams,
        );
    }
  };
};

export const activeEditorReady = (service, isBanned) => {
  const listenerParams = { userId: service.machine.context.userId };

  if (isBanned) {
    service.send('load_banned_editor');
  } else {
    service.send('load_active_editor');
  }

  // channel.on('editor:data', data => {
  //   const { userId } = data;
  //   service.send('typing', { userId });
  // });

  const handleUserBanned = data => {
    service.send('banned_user', data);
  };

  const handleUserUnbanned = data => {
    service.send('unbanned_user', data);
  };

  const handleStartsCheck = data => {
    service.send('check_solution_received', data);
  };

  const handleNewCheckResult = data => {
    service.send('receive_check_result', data);
  };

  channel
    .addListener(
      channelTopics.userBanned,
      handleUserBanned,
    )
    .addListener(
      channelTopics.userUnbanned,
      handleUserUnbanned,
    )
    .addListener(channelTopics.userStartCheckTopic, handleStartsCheck)
    .addListener(
      channelTopics.userCheckCompleteTopic,
      handleNewCheckResult,
    );

  return () => {
    channel
      .removeListeners(channelTopics.userBanned, listenerParams)
      .removeListeners(channelTopics.userUnbanned, listenerParams)
      .removeListeners(channelTopics.userStartCheckTopic, listenerParams)
      .removeListeners(channelTopics.userCheckCompleteTopic, listenerParams);
  };
};

export const activeGameReady = (gameRoomService, waitingRoomService, { cancelRedirect = false }) => (dispatch, getState) => {
  initGameChannel(
    gameRoomService,
    waitingRoomService,
  )(dispatch);

  const handleNewEditorData = data => {
    dispatch(actions.updateEditorText(data));
  };

  const handleStartsCheck = ({ user_id: userId }) => {
    dispatch(actions.updateCheckStatus({ [userId]: true }));
  };

  const handleNewCheckResult = responseData => {
    const {
      state, solutionStatus, checkResult, players, userId, award,
    } = responseData;
    if (solutionStatus) {
      channel
        .push(channelMethods.gameScore, {})
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

    const payload = { state, award };
    gameRoomService.send(channelTopics.userCheckCompleteTopic, { payload });
  };

  const handleUserJoined = data => {
    const {
      state, startsAt, timeoutSeconds, langs, players, task,
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
    gameRoomService.send(channelTopics.gameUserJoinedTopic, {
      payload: data,
    });
  };

  const handleUserWon = data => {
    const { players, state, msg } = data;
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ state, msg }));
    gameRoomService.send(channelTopics.userWonTopic, { payload: data });
  };

  const handleUserGiveUp = data => {
    const { players, state, msg } = data;
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ state, msg }));
    channel
      .push(channelMethods.gameScore, {})
      .receive('ok', response => dispatch(actions.setGameScore(response)));
    gameRoomService.send(channelTopics.userGiveUpTopic, { payload: data });
  };

  const handleRematchStatusUpdate = data => {
    dispatch(actions.updateRematchStatus(data));
    gameRoomService.send(channelTopics.rematchStatusUpdatedTopic, {
      payload: data,
    });
  };

  const handleRematchAccepted = ({ gameId: newGameId }) => {
    gameRoomService.send(channelTopics.rematchAcceptedTopic, { newGameId });
    redirectToNewGame(newGameId);
  };

  const handleGameTimeout = data => {
    const { gameState } = data;
    const payload = { state: gameState };
    dispatch(actions.updateGameStatus(payload));
    gameRoomService.send(channelTopics.gameTimeoutTopic, { payload });
  };

  const handleGameToggleVisible = () => {
    dispatch(actions.toggleVisible());
  };

  const handleGameUnlocked = () => {
    dispatch(actions.setLocked(false));
  };

  const handleTournamentGameCreated = data => {
    dispatch(actions.setTournamentsInfo(data));
    gameRoomService.send(channelTopics.tournamentGameCreatedTopic, {
      payload: data,
    });
    if (!cancelRedirect) {
      setTimeout(() => {
        window.location.replace(makeGameUrl(data.gameId));
      }, 10);
    }
  };

  const handleTournamentRoundCreated = response => {
    dispatch(actions.updateTournamentData(response));
  };

  const handleTournamentRoundFinished = response => {
    dispatch(actions.updateTournamentData(response.tournament));
    dispatch(actions.updateTournamentMatches(response.matches || []));
    gameRoomService.send(channelTopics.tournamentRoundFinishedTopic, {
      payload: response.tournament,
    });
  };

  const handleTournamentGameWait = response => {
    dispatch(actions.setTournamentWaitType(response.type));
  };

  const handleWaitingRoomPlayerFinishedRound = response => {
    waitingRoomService.send(
      channelTopics.tournamentPlayerFinishedRoundTopic,
      { payload: response },
    );
  };

  const handleWaitingRoomPlayerFinished = response => {
    waitingRoomService.send(channelTopics.tournamentPlayerFinishedTopic, {
      payload: response,
    });
  };

  addWaitingRoomListeners(
    channel,
    waitingRoomService,
    { cancelRedirect },
  )(dispatch, getState);

  return channel
    .addListener(channelTopics.editorDataTopic, handleNewEditorData)
    .addListener(
      channelTopics.userStartCheckTopic,
      handleStartsCheck,
    )
    .addListener(
      channelTopics.userCheckCompleteTopic,
      handleNewCheckResult,
    )
    .addListener(channelTopics.userWonTopic, handleUserWon)
    .addListener(channelTopics.userGiveUpTopic, handleUserGiveUp)
    .addListener(
      channelTopics.rematchStatusUpdatedTopic,
      handleRematchStatusUpdate,
    )
    .addListener(
      channelTopics.rematchAcceptedTopic,
      handleRematchAccepted,
    )
    .addListener(
      channelTopics.gameUserJoinedTopic,
      handleUserJoined,
    )
    .addListener(channelTopics.gameTimeoutTopic, handleGameTimeout)
    .addListener(
      channelTopics.gameToggleVisibleTopic,
      handleGameToggleVisible,
    )
    .addListener(
      channelTopics.gameUnlockedTopic,
      handleGameUnlocked,
    )
    .addListener(
      channelTopics.tournamentGameCreatedTopic,
      handleTournamentGameCreated,
    )
    .addListener(
      channelTopics.tournamentRoundCreatedTopic,
      handleTournamentRoundCreated,
    )
    .addListener(
      channelTopics.tournamentRoundFinishedTopic,
      handleTournamentRoundFinished,
    )
    .addListener(
      channelTopics.tournamentGameWaitTopic,
      handleTournamentGameWait,
    )
    .addListener(
      channelTopics.tournamentPlayerFinishedRoundTopic,
      handleWaitingRoomPlayerFinishedRound,
    )
    .addListener(
      channelTopics.tournamentPlayerFinishedTopic,
      handleWaitingRoomPlayerFinished,
    );
};

const fetchOrCreateTask = (gameService, taskService) => (dispatch, getState) => {
  const currentTask = getState().builder.task;

  taskService.send('SETUP_TASK', { payload: currentTask });

  const state = GameStateCodes.builder;
  const message = { payload: { state } };
  gameService.send('LOAD_GAME', message);
};

export const reloadGeneratorAndSolutionTemplates = taskService => (dispatch, getState) => {
  const state = getState();

  const langs = selectors.editorLangsSelector(state);

  const solution = langs.reduce(
    (acc, lang) => (lang.argumentsGeneratorTemplate
      ? { ...acc, [lang.slug]: lang.solutionTemplate }
      : acc),
    {},
  );
  const argumentsGenerator = langs.reduce(
    (acc, lang) => (lang.argumentsGeneratorTemplate
      ? { ...acc, [lang.slug]: lang.argumentsGeneratorTemplate }
      : acc),
    {},
  );

  dispatch(actions.setTaskTemplates({ solution, argumentsGenerator }));
  taskService.send('CHANGES');
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
        dispatch(
          actions.setValidationStatuses({
            name: [false, 'Name must be unique'],
          }),
        );
      }
    })
    .catch(error => {
      dispatch(actions.setValidationStatuses({ name: [false, error.message] }));
    });
};

export const updateTaskState = (id, state) => dispatch => {
  axios
    .patch(
      `/api/v1/tasks/${id}`,
      { task: { state } },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      },
    )
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
    .patch(
      `/api/v1/tasks/${id}`,
      { task: { visibility } },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      },
    )
    .then(() => {
      dispatch(actions.setTaskVisibility(visibility));
    })
    .catch(error => {
      dispatch(actions.setError(error));
      console.error(error);
      onError(error);
    });
};

export const uploadTask = (taskParams, taskService, onSuccess = () => { }, onError = () => { }) => dispatch => {
  const payload = {
    task: decamelizeKeys(taskParams, { separator: '_' }),
    options: {
      next_state: taskStateCodes.blank,
    },
  };

  axios
    .post('/api/v1/tasks', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(response => {
      const data = camelizeKeys(response.data);
      const labledTask = labelTaskParamsWithIds(data.task);

      dispatch(actions.setTask({ task: labledTask }));
      taskService.send('CONFIRM');
      onSuccess();
    })
    .catch(err => {
      onError(err);

      dispatch(actions.setError(err));
      console.error(err);
    });
};

export const saveTask = (taskService, onSuccess = () => { }, onError = () => { }, newTaskParams) => (dispatch, getState) => {
  try {
    const state = getState();

    const taskParams = newTaskParams || selectors.taskParamsSelector()(state);
    const payload = {
      task: decamelizeKeys(taskParams, { separator: '_' }),
      options: {
        next_state: newTaskParams?.state || taskStateCodes.draft,
      },
    };

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

          taskService.send('CONFIRM');
          window.location.href = `/tasks/${data.task.id}`;
          onSuccess();
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
          taskService.send('CONFIRM');
          onSuccess();
        })
        .catch(err => {
          onError(err);

          dispatch(actions.setError(err));
          console.error(err);
        });
    }
  } catch (err) {
    onError(err);

    dispatch(actions.setError(err));
    console.error(err);
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

export const buildTaskAsserts = taskService => (dispatch, getState) => {
  const state = getState();

  if (state.builder.templates.state !== taskTemplatesStates.init) {
    dispatch(
      actions.setTaskAsserts({
        asserts: state.builder.task.assertsExamples.map(
          ({ arguments: args, expected }) => ({
            arguments: JSON.parse(args),
            expected: JSON.parse(expected),
          }),
        ),
        status: 'ok',
      }),
    );

    taskService.send('SUCCESS');
    return;
  }

  const taskParams = selectors.taskParamsSelector({ normalize: false })(state);
  const editorLang = selectors.taskGeneratorLangSelector(state);
  const textSolution = selectors.taskSolutionSelector(state, editorLang);
  const textArgumentsGenerator = selectors.taskArgumentsGeneratorSelector(
    state,
    editorLang,
  );

  axios
    .post(
      '/api/v1/tasks/build',
      {
        task: decamelizeKeys(taskParams, { separator: '_' }),
        arguments_generator_text: textArgumentsGenerator,
        solution_text: textSolution,
        editor_lang: editorLang,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      },
    )
    .then(response => {
      const data = camelizeKeys(response.data);

      dispatch(
        actions.setTaskAsserts({
          asserts: data.asserts || [],
          status: data.status,
          output: data.message,
        }),
      );

      switch (data.status) {
        case 'ok': {
          taskService.send('SUCCESS');
          break;
        }
        case 'failure':
          taskService.send('FAILURE', {
            message: "Actual values doesn't match with expected values",
          });
          break;
        case 'error': {
          taskService.send('ERROR', { message: data.message });
          break;
        }
        default: {
          taskService.send('ERROR', {
            message: data.message || 'Something Wrong',
          });
        }
      }
    })
    .catch(err => {
      dispatch(
        actions.setTaskAsserts({
          asserts: [],
          status: 'error',
          output: err.message,
        }),
      );
      taskService.send('ERROR', { message: err.message });

      dispatch(actions.setError(err));
      console.error(err);
    });
};

const fetchPlaybook = (service, init) => dispatch => {
  service.send('START_LOADING_PLAYBOOK');

  axios
    .get(`/api/v1/playbook/${gameId}`)
    .then(response => {
      const data = camelizeKeys(response.data);
      const type = isRecord
        ? PlaybookStatusCodes.stored
        : PlaybookStatusCodes.active;
      const resolvedData = resolveDiffs(data, type);

      init(dispatch)(resolvedData);

      service.send('LOAD_PLAYBOOK', { payload: resolvedData });
    })
    .catch(err => {
      console.error(err);
      dispatch(actions.setError(err));
      service.send('REJECT_LOADING_PLAYBOOK', { payload: err });
    });
};

export const changePlaybookSolution = method => dispatch => {
  axios
    .post(
      `/api/v1/playbooks/${method}`,
      {
        game_id: gameId,
      },
      {
        headers: {
          'Content-type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      },
    )
    .then(response => {
      const data = camelizeKeys(response.data);

      if (data.errors) {
        console.error(data.errors);
        dispatch(
          actions.setError({
            message: data.errors[0],
          }),
        );
      } else {
        dispatch(actions.changeSolutionType(data));
      }
    })
    .catch(error => {
      console.error(error);
      dispatch(actions.setError(error));
    });
};

export const storedEditorReady = service => {
  service.send('load_stored_editor');

  return () => { };
};

export const downloadPlaybook = service => dispatch => {
  dispatch(fetchPlaybook(service, initPlaybook));
};

export const openPlaybook = service => () => {
  service.send('OPEN_REPLAYER');
};

export const connectToTask = (gameService, taskService) => dispatch => {
  dispatch(fetchOrCreateTask(gameService, taskService));
};

export const connectToGame = (gameRoomService, waitingRoomService, options) => dispatch => {
  if (isRecord) {
    return fetchPlaybook(gameRoomService, initStoredGame)(dispatch);
  }

  gameRoomService.send('JOIN');

  return activeGameReady(gameRoomService, waitingRoomService, options)(dispatch);
};

export const connectToEditor = (service, isBanned) => () => (isRecord ? storedEditorReady(service) : activeEditorReady(service, isBanned));

export const checkGameSolution = () => (dispatch, getState) => {
  const state = getState();
  const currentUserId = selectors.currentUserIdSelector(state);
  const { text, lang } = selectors.getSolution(currentUserId)(state);

  // FIXME: create actions for this state transitions
  // FIXME: create statuses for solutionStatus
  dispatch(actions.updateGameStatus({ solutionStatus: null }));
  dispatch(actions.updateCheckStatus({ [currentUserId]: true }));

  const payload = {
    editorText: text,
    langSlug: lang,
  };

  channel.push(channelMethods.checkResult, payload);
};

export const checkTaskSolution = editorService => (dispatch, getState) => {
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

  editorService.send('user_check_solution');

  axios
    .post('/api/v1/tasks/check', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then(response => {
      const { checkResult } = camelizeKeys(response.data);

      dispatch(
        actions.updateExecutionOutput({
          ...checkResult,
          userId: currentUserId,
        }),
      );
      editorService.send('receive_check_result', { userId: currentUserId });
    })
    .catch(error => {
      dispatch(
        actions.updateExecutionOutput({
          status: 'error',
          outputError: error.message,
          asserts: [],
          version: 2,
          userId: currentUserId,
        }),
      );
      editorService.send('receive_check_result', { userId: currentUserId });
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
    dispatch(
      actions.updateEditorTextHistory({
        userId: player.id,
        editorText: player.editorText,
        langSlug: player.editorLang,
      }),
    );

    dispatch(
      actions.updateExecutionOutputHistory({
        ...player.checkResult,
        userId: player.id,
      }),
    );
  });

  dispatch(actions.updateChatDataHistory(chatState));
};

export const updateGameHistoryState = nextRecordId => (dispatch, getState) => {
  const state = getState();
  const records = selectors.playbookRecordsSelector(state);
  const nextRecord = parse(records[nextRecordId]) || {};

  switch (nextRecord.type) {
    case 'update_editor_data': {
      const editorText = selectors.editorTextHistorySelector(
        state,
        nextRecord,
      );
      const editorLang = selectors.editorLangHistorySelector(
        state,
        nextRecord,
      );
      const newEditorText = getText(editorText, nextRecord.diff);

      dispatch(
        actions.updateEditorTextHistory({
          userId: nextRecord.userId,
          editorText: newEditorText,
          langSlug: nextRecord.diff.nextLang || editorLang,
        }),
      );
      break;
    }
    case 'check_complete':
      dispatch(
        actions.updateExecutionOutputHistory({
          ...nextRecord.checkResult,
          userId: nextRecord.userId,
        }),
      );
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
