import _ from 'lodash';
import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import socket from '../../socket';
import * as selectors from '../selectors';
import userTypes from '../config/userTypes';
import * as actions from '../actions';

import { resolveDiffs } from '../lib/player';
import PlaybookStatusCodes from '../config/playbookStatusCodes';
import GameStatusCodes from '../config/gameStatusCodes';

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

const initGameChannel = dispatch => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const {
      status,
      startsAt,
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

    dispatch(actions.finishStoreInit());
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
  channel.push('editor:data', { editor_text: editorText, lang_slug: currentLangSlug });
};

export const sendGiveUp = () => {
  channel.push('give_up');
};

export const sendOfferToRematch = () => {
  channel.push('rematch:send_offer');
};

export const sendRejectToRematch = () => {
  channel.push('rematch:reject_offer');
};

export const sendAcceptToRematch = () => {
  channel.push('rematch:accept_offer');
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

export const activeGameEditorReady = () => dispatch => {
  initGameChannel(dispatch);
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
  });

  channel.on('user:joined', responseData => {
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
  });

  channel.on('user:won', data => {
    const { players, status, msg } = camelizeKeys(data);
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ status, msg }));
  });

  channel.on('user:give_up', data => {
    const { players, status, msg } = camelizeKeys(data);
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ status, msg }));
  });

  channel.on('rematch:update_status', payload => {
    const data = camelizeKeys(payload);
    dispatch(actions.updateGameStatus(data));
  });

  channel.on('rematch:redirect_to_new_game', ({ game_id: newGameId }) => {
    actions.redirectToNewGame(newGameId);
  });

  channel.on('game:timeout', ({ status, msg }) => {
    dispatch(actions.updateGameStatus({ status, msg }));
  });
};

export const storedGameEditorReady = () => dispatch => {
  axios
    .get(`/api/v1/playbook/${gameId}`)
    .then(response => {
      const data = camelizeKeys(response.data);
      const resolvedData = resolveDiffs(data);

      const gameStatus = {
        status: GameStatusCodes.stored,
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
      dispatch(actions.finishStoreInit());
    })
};

export const init = () => dispatch => {
  dispatch(isRecord ? storedGameEditorReady() : activeGameEditorReady());
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

export const compressEditorHeight = userId => dispatch => (
  dispatch(actions.compressEditorHeight({ userId }))
);
export const expandEditorHeight = userId => dispatch => (
  dispatch(actions.expandEditorHeight({ userId }))
);
