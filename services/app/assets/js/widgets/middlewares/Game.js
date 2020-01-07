import _ from 'lodash';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import socket from '../../socket';
import * as selectors from '../selectors';
import userTypes from '../config/userTypes';
import * as actions from '../actions';

const languages = Gon.getAsset('langs');
const gameId = Gon.getAsset('game_id');
const channelName = `game:${gameId}`;
const channel = socket.channel(channelName);

const initGameChannel = (dispatch) => {
  const onJoinFailure = (response) => {
    console.log(response);
    window.location.reload();
  };

  const onJoinSuccess = (response) => {
    const {
      status,
      startsAt,
      joinsAt,
      timeoutSeconds,
      players: [firstPlayer, secondPlayer],
      task,
      rematchState,
      tournamentId,
      rematchInitiatorId,
    } = camelizeKeys(response);

    // const firstEditorLang = _.find(languages, { slug: user1.editor_lang });
    // const users = [{ ...user1, type: userTypes.firstPlayer }];

    // if (user2) {
    // const secondEditorLang = _.find(languages, { slug: user2.editor_lang });
    // users.push({ ...user2, type: userTypes.secondPlayer });
    // }

    const players = [{ ...firstPlayer, type: userTypes.firstPlayer }];

    if (secondPlayer) {
      players.push({ ...secondPlayer, type: userTypes.secondPlayer });
    }

    dispatch(actions.updateGamePlayers({ players }));

    dispatch(
      actions.updateEditorText({
        userId: firstPlayer.id,
        editorText: firstPlayer.editorText,
        langSlug: firstPlayer.editorLang,
      }),
    );

    dispatch(
      actions.updateExecutionOutput({
        userId: firstPlayer.id,
        result: firstPlayer.result,
        output: firstPlayer.output,
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
          userId: secondPlayer.id,
          result: secondPlayer.result,
          output: secondPlayer.output,
        }),
      );
    }

    if (task) {
      dispatch(actions.setGameTask({ task }));
    }

    dispatch(
      actions.updateGameStatus({
        status,
        startsAt,
        joinsAt,
        timeoutSeconds,
        rematchState,
        rematchInitiatorId,
        tournamentId,
      }),
    );

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

  channel.push('editor:data', { editor_text: editorText, lang: currentLangSlug });

  // if (langSlug !== null) {
  //   channel.push('editor:lang', { lang: currentLangSlug });
  // }
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

export const sendEditorLang = (currentLangSlug) => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);

  dispatch(actions.updateEditorLang({ userId, currentLangSlug }));

  // channel.push('editor:lang', { lang: currentLangSlug });
};

export const changeCurrentLangAndSetTemplate = (langSlug) => (dispatch, getState) => {
  const state = getState();
  const currentText = selectors.currentPlayerTextByLangSelector(langSlug)(state);
  const { solution_template: template } = _.find(languages, { slug: langSlug });
  const textToSet = currentText || template;
  dispatch(sendEditorText(textToSet, langSlug));
};

export const editorReady = () => (dispatch) => {
  initGameChannel(dispatch);
  channel.on('editor:data', (data) => {
    dispatch(actions.updateEditorText(camelizeKeys(data)));
  });

  channel.on('output:data', (data) => {
    dispatch(actions.updateExecutionOutput(camelizeKeys(data)));
  });

  channel.on('user:start_check', ({ user }) => {
    dispatch(actions.updateCheckStatus({ [user.id]: true }));
  });

  channel.on('user:finish_check', ({ user }) => {
    dispatch(actions.updateCheckStatus({ [user.id]: false }));
  });

  channel.on(
    'user:check_result',
    (responseData) => {
      const {
        status,
        players,
        solutionStatus,
        output,
        result,
        assertsCount,
        successCount,
        userId,
      } = camelizeKeys(responseData);
      const newGameStatus = solutionStatus ? { status } : {};
      const asserts = { assertsCount, successCount };
      if (players) {
        dispatch(actions.updateGamePlayers({ players }));
      }
      dispatch(
        actions.updateExecutionOutput({
          output,
          result,
          asserts,
          userId,
        }),
      );
      dispatch(actions.updateGameStatus({ ...newGameStatus, solutionStatus }));
      dispatch(actions.updateCheckStatus({ [userId]: false }));
    },
  );

  channel.on(
    'user:joined',
    (responseData) => {
      const {
        status,
        startsAt,
        joinsAt,
        timeoutSeconds,
        players: [firstPlayer, secondPlayer],
        task,
      } = camelizeKeys(responseData);
      const players = [
        { ...firstPlayer, type: userTypes.firstPlayer },
        { ...secondPlayer, type: userTypes.secondPlayer },
      ];

      dispatch(actions.updateGamePlayers({ players }));
      dispatch(actions.setGameTask({ task }));

      dispatch(
        actions.updateEditorText({
          userId: firstPlayer.id,
          editorText: firstPlayer.editorText,
          langSlug: firstPlayer.editorLang,
        }),
      );

      dispatch(
        actions.updateExecutionOutput({
          userId: firstPlayer.id,
          result: firstPlayer.result,
          output: firstPlayer.output,
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
            userId: secondPlayer.id,
            result: secondPlayer.result,
            output: secondPlayer.output,
          }),
        );
      }

      dispatch(
        actions.updateGameStatus({
          status,
          startsAt,
          joinsAt,
          timeoutSeconds,
        }),
      );
    },
  );

  channel.on('user:won', (data) => {
    const { players, status, msg } = camelizeKeys(data);
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ status, msg }));
  });

  channel.on('give_up', (data) => {
    const { players, status, msg } = camelizeKeys(data);
    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.updateGameStatus({ status, msg }));
  });

  channel.on('rematch:update_status', (payload) => {
    dispatch(actions.updateGameStatus(payload));
  });

  channel.on('rematch:redirect_to_new_game', ({ game_id: newGameId }) => {
    actions.redirectToNewGame(newGameId);
  });

  channel.on('game:timeout', ({ status, msg }) => {
    dispatch(actions.updateGameStatus({ status, msg }));
  });
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
    lang: currentUserEditor.currentLangSlug,
  };
  channel.push('check_result', payload);
};

export const compressEditorHeight = (userId) => (dispatch) => (
  dispatch(actions.compressEditorHeight({ userId }))
);
export const expandEditorHeight = (userId) => (dispatch) => (
  dispatch(actions.expandEditorHeight({ userId }))
);
