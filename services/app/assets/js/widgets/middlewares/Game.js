import _ from 'lodash';
import Gon from 'gon';
import socket from '../../socket';
import * as selectors from '../selectors';
import userTypes from '../config/userTypes';
import * as actions from '../actions';

const languages = Gon.getAsset('langs');
const gameId = Gon.getAsset('game_id');
const channelName = `game:${gameId}`;
const channel = socket.channel(channelName);

const initGameChannel = (dispatch) => {
  const onJoinSuccess = (response) => {
    const {
      status,
      starts_at: startsAt,
      players: [firstPlayer, secondPlayer],
      task,
    } = response;

    // const firstEditorLang = _.find(languages, { slug: user1.editor_lang });
    // const users = [{ ...user1, type: userTypes.firstPlayer }];

    // if (user2) {
    // const secondEditorLang = _.find(languages, { slug: user2.editor_lang });
    // users.push({ ...user2, type: userTypes.secondPlayer });
    // }

    const players = [
      { ...firstPlayer, type: userTypes.firstPlayer },
      { ...secondPlayer, type: userTypes.secondPlayer },
    ];

    dispatch(actions.updateGamePlayers({ players }));

    dispatch(actions.updateEditorText({
      userId: firstPlayer.id,
      text: firstPlayer.editor_text,
      langSlug: firstPlayer.editor_lang,
    }));

    dispatch(actions.updateExecutionOutput({
      userId: firstPlayer.id,
      result: firstPlayer.result,
      output: firstPlayer.output,
    }));

    if (secondPlayer) {
      dispatch(actions.updateEditorText({
        userId: secondPlayer.id,
        text: secondPlayer.editor_text,
        langSlug: secondPlayer.editor_lang,
      }));

      dispatch(actions.updateExecutionOutput({
        userId: secondPlayer.id,
        result: secondPlayer.result,
        output: secondPlayer.output,
      }));
    }

    if (task) {
      dispatch(actions.setGameTask({ task }));
    }
    dispatch(actions.updateGameStatus({ status, startsAt }));
    dispatch(actions.finishStoreInit());
  };

  channel.join().receive('ignore', () => console.log('Game channel: auth error'))
    .receive('error', () => console.log('Game channel: unable to join'))
    .receive('ok', onJoinSuccess);

  channel.onError(ev => console.log('Game channel: something went wrong', ev));
  channel.onClose(ev => console.log('Game channel: closed', ev));
};

export const sendEditorText = (text, langSlug = null) => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(userId)(state);
  dispatch(actions.updateEditorText({ userId, text, langSlug: currentLangSlug }));

  channel.push('editor:data', { editor_text: text, lang: currentLangSlug });

  // if (langSlug !== null) {
  //   channel.push('editor:lang', { lang: currentLangSlug });
  // }
};

export const sendGiveUp = () => {
  channel.push('give_up');
};

export const sendEditorLang = currentLangSlug => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);

  dispatch(actions.updateEditorLang({ userId, currentLangSlug }));

  // channel.push('editor:lang', { lang: currentLangSlug });
};

export const changeCurrentLangAndSetTemplate = langSlug => (dispatch, getState) => {
  const state = getState();
  const currentText = selectors.currentPlayerTextByLangSelector(langSlug)(state);
  const { solution_template: template } = _.find(languages, { slug: langSlug });
  // if (_.isUndefined(currentText)) {
  //   dispatch(sendEditorText(template, langSlug));
  // } else {
  //   dispatch(sendEditorLang(langSlug));
  // }
  const textToSet = currentText || template;
  dispatch(sendEditorText(textToSet, langSlug));
};

export const editorReady = () => (dispatch) => {
  initGameChannel(dispatch);
  channel.on('editor:data', ({ user_id: userId, lang_slug: langSlug, editor_text: text }) => {
    dispatch(actions.updateEditorText({ userId, langSlug, text }));
  });

  channel.on('output:data', ({ user_id: userId, result, output }) => {
    dispatch(actions.updateExecutionOutput({ userId, result, output }));
  });

  channel.on('user:startCheck', ({ user }) => {
    dispatch(actions.updateCheckStatus({ [user.id]: true }));
  });

  channel.on('user:finishCheck', ({ user }) => {
    dispatch(actions.updateCheckStatus({ [user.id]: false }));
  });

  channel.on('user:joined', ({
    status,
    starts_at: startsAt,
    players: [firstPlayer, secondPlayer],
    task,
  }) => {
    const players = [
      { ...firstPlayer, type: userTypes.firstPlayer },
      { ...secondPlayer, type: userTypes.secondPlayer },
    ];

    dispatch(actions.updateGamePlayers({ players }));
    dispatch(actions.setGameTask({ task }));

    dispatch(actions.updateEditorText({
      userId: firstPlayer.id,
      text: firstPlayer.editor_text,
      langSlug: firstPlayer.editor_lang,
    }));

    dispatch(actions.updateExecutionOutput({
      userId: firstPlayer.id,
      result: firstPlayer.result,
      output: firstPlayer.output,
    }));

    if (secondPlayer) {
      dispatch(actions.updateEditorText({
        userId: secondPlayer.id,
        text: secondPlayer.editor_text,
        langSlug: secondPlayer.editor_lang,
      }));

      dispatch(actions.updateExecutionOutput({
        userId: secondPlayer.id,
        result: secondPlayer.result,
        output: secondPlayer.output,
      }));
    }

    dispatch(actions.updateGameStatus({ status, startsAt }));
  });

  channel.on('user:won', ({ winner, status, msg }) => {
    dispatch(actions.updateGameStatus({ status, winner }));
  });

  channel.on('give_up', ({ players, status, msg }) => {
    dispatch(actions.updateGameStatus({ status }));
    dispatch(actions.updateGamePlayers({ players }));
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
  channel.push('check_result', payload)
    .receive('ok', ({
      status, winner, solution_status: solutionStatus, output, result, user_id: userId,
    }) => {
      const newGameStatus = solutionStatus ? { status, winner } : {};
      dispatch(actions.updateExecutionOutput({ output, result, userId }));
      dispatch(actions.updateGameStatus({ ...newGameStatus, solutionStatus }));
      dispatch(actions.updateCheckStatus({ [currentUserId]: false }));
    });
};

export const compressEditorHeight = (
  userId => dispatch => dispatch(actions.compressEditorHeight({ userId }))
);
export const expandEditorHeight = (
  userId => dispatch => dispatch(actions.expandEditorHeight({ userId }))
);
