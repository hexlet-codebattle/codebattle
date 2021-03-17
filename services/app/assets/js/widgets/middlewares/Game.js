import _ from 'lodash';
import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import socket from '../../socket';
import * as selectors from '../selectors';
import userTypes from '../config/userTypes';
import { actions, redirectToNewGame } from '../slices';
import {
 parse, getFinalState, getText, resolveDiffs,
} from '../lib/player';

import PlaybookStatusCodes from '../config/playbookStatusCodes';
import GameStatusCodes from '../config/gameStatusCodes';

import notification from '../utils/notification';

const defaultLanguages = Gon.getAsset('langs');
const gameId = Gon.getAsset('game_id');
const isRecord = Gon.getAsset('is_record');
const channelName = `game:${gameId}`;
const channel = !isRecord ? socket.channel(channelName) : null;

const initEditors = dispatch => (updateEditorTextAction, firstPlayer, secondPlayer) => {
  dispatch(
    updateEditorTextAction({
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
      updateEditorTextAction({
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
};

const initStore = dispatch => ({
  firstPlayer,
  secondPlayer,
  task,
  langs,
  gameStatus,
  playbookStatusCode,
}) => {
  const isStored = playbookStatusCode === PlaybookStatusCodes.stored;
  const players = [{ ...firstPlayer, type: userTypes.firstPlayer }];

  if (secondPlayer) {
    players.push({ ...secondPlayer, type: userTypes.secondPlayer });
  }

  dispatch(actions.setLangs({ langs }));
  dispatch(actions.updateGamePlayers({ players }));

  const updateEditorTextAction = isStored
    ? actions.updateEditorTextPlaybook
    : actions.updateEditorText;

  initEditors(dispatch)(updateEditorTextAction, firstPlayer, secondPlayer);

  if (task) {
    dispatch(actions.setGameTask({ task }));
  }

  if (gameStatus) {
    dispatch(actions.updateGameStatus(gameStatus));
  }
};

const initGameChannel = (dispatch, machine) => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const {
      status,
      startsAt,
      type,
      timeoutSeconds,
      players: [firstPlayer, secondPlayer],
      task,
      langs,
      rematchState,
      tournamentId,
      rematchInitiatorId,
    } = camelizeKeys(response);

    const gameStatus = {
      status,
      type,
      startsAt,
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
      switch (status) {
        case GameStatusCodes.waitingOpponent: {
          machine.send('load_waiting_game');
          break;
        }
        case GameStatusCodes.playing: {
          machine.send('load_active_game');
          break;
        }
        case GameStatusCodes.gameOver:
        case GameStatusCodes.timeout: {
          machine.send('load_finished_game');
          break;
        }
        default: {
          const error = new Error('(loading game state) unexpected status');
          dispatch(actions.setError(error));
        }
      }
    }, 2000);
  };

  channel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);
};

export const sendEditorText = (editorText, langSlug = null) => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(userId)(state);
  dispatch(actions.updateEditorText({ userId, editorText, langSlug: currentLangSlug }));
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

export const changeCurrentLangAndSetTemplate = langSlug => (dispatch, getState) => {
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
      status, solutionStatus, checkResult, players, userId,
    } = camelizeKeys(responseData);
    const newGameStatus = solutionStatus ? { status } : {};

    dispatch(actions.updateGamePlayers({ players }));

    dispatch(
      actions.updateExecutionOutput({
        ...checkResult,
        userId,
      }),
    );
    dispatch(actions.updateGameStatus({ ...newGameStatus, solutionStatus }));
    dispatch(actions.updateCheckStatus({ [userId]: false }));

    const payload = { status };
    machine.send('user:check_complete', { payload });
  });

  channel.on('game:user_joined', responseData => {
    const {
      status,
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
        status,
        startsAt,
        timeoutSeconds,
      }),
    );
    machine.send('game:user_joined', { payload: camelizeKeys(responseData) });
  });

  channel.on('user:won', data => {
    const { players, status, msg } = camelizeKeys(data);
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ status, msg }));
    machine.send('user:won', { payload: camelizeKeys(data) });
  });

  channel.on('user:give_up', data => {
    const { players, status, msg } = camelizeKeys(data);
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ status, msg }));
    machine.send('user:give_up', { payload: camelizeKeys(data) });
  });

  channel.on('rematch:update_status', payload => {
    const data = camelizeKeys(payload);
    dispatch(actions.updateGameStatus(data));
    machine.send('rematch:update_status', { payload: data });
  });

  channel.on('rematch:redirect_to_new_game', ({ game_id: newGameId }) => {
    machine.send('rematch:redirect_to_new_game', { newGameId });
    redirectToNewGame(newGameId);
  });

  channel.on('game:timeout', ({ status, msg }) => {
    const data = { status, msg };
    dispatch(actions.updateGameStatus(data));
    machine.send('game:timeout', { payload: data });
  });

  channel.on('tournament:round_created', payload => {
    dispatch(actions.setTournamentsInfo(payload));
    machine.send('tournament:round_created', { payload });
  });
};

export const storedGameReady = machine => dispatch => {
  axios
    .get(`/api/v1/playbook/${gameId}`)
    .then(response => {
      const data = camelizeKeys(response.data);
      const resolvedData = resolveDiffs(data);

      const gameStatus = {
        status: GameStatusCodes.stored,
        type: data.type,
        tournamentId: data.tournamentId,
      };

      initStore(dispatch)({
        firstPlayer: resolvedData.players[0],
        secondPlayer: resolvedData.players[1],
        task: resolvedData.task,
        gameStatus,
        playbookStatusCode: PlaybookStatusCodes.stored,
      });

      dispatch(actions.loadStoredPlaybook(resolvedData));
      dispatch(actions.fetchChatData(resolvedData.chat));

      setTimeout(() => {
        machine.send('load_stored_game', { payload: data });
      }, 2000);
    })
    .catch(error => {
      dispatch(actions.setError(error));
    });
};

export const storedEditorReady = machine => () => {
  machine.send('load_stored_editor');
};

export const connectToGame = machine => dispatch => {
  dispatch(isRecord ? storedGameReady(machine) : activeGameReady(machine));
};

export const connectToEditor = machine => dispatch => {
  dispatch(isRecord ? storedEditorReady(machine) : activeEditorReady(machine));
};

export const checkGameResult = () => (dispatch, getState) => {
  const state = getState();
  const currentUserId = selectors.currentUserIdSelector(state);
  const currentUserEditor = selectors.editorDataSelector(currentUserId)(state);

  // FIXME: create actions for this state transitions
  // FIXME: create statuses for solutionStatus
  dispatch(actions.updateGameStatus({ solutionStatus: null }));
  dispatch(actions.updateCheckStatus({ [currentUserId]: true }));

  const payload = {
    editor_text: currentUserEditor.text,
    lang_slug: currentUserEditor.currentLangSlug,
  };

  channel.push('check_result', payload);
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
