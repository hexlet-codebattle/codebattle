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
      winner,
      starts_at,
      first_player,
      second_player,
      first_player_editor_text,
      second_player_editor_text,
      first_player_editor_lang,
      second_player_editor_lang,
      task,
    } = response;

    // const firstEditorLang = _.find(languages, { slug: first_player_editor_lang });
    // const secondEditorLang = _.find(languages, { slug: second_player_editor_lang });

    const users = [{
      id: first_player.id,
      name: first_player.name,
      rating: first_player.rating,
      github_id: first_player.github_id,
      type: userTypes.firstPlayer,
    }];

    if (second_player.id) {
      users.push({
        id: second_player.id,
        name: second_player.name,
        rating: second_player.rating,
        github_id: second_player.github_id,
        type: userTypes.secondPlayer,
      });
    }

    dispatch(actions.updateUsers({ users }));

    dispatch(actions.updateEditorText({
      userId: first_player.id,
      text: first_player_editor_text,
      langSlug: first_player_editor_lang,
    }));

    if (second_player.id) {
      dispatch(actions.updateEditorText({
        userId: second_player.id,
        text: second_player_editor_text,
        langSlug: second_player_editor_lang,
      }));
    }

    dispatch(actions.setGameTask({ task }));
    dispatch(actions.updateGameStatus({ status, winner, startsAt: starts_at }));
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
  const currentLang = langSlug || selectors.userLangSelector(userId)(state);
  dispatch(actions.updateEditorText({ userId, text, langSlug: currentLang }));

  channel.push('editor:text', { editor_text: text });

  if (langSlug !== null) {
    channel.push('editor:lang', { lang: currentLang });
  }
};

export const sendGiveUp = () => {
  channel.push('give_up');
};

export const sendEditorLang = currentLang => (dispatch, getState) => {
  const state = getState();
  const userId = selectors.currentUserIdSelector(state);

  dispatch(actions.updateEditorLang({ userId, currentLang }));

  channel.push('editor:lang', { lang: currentLang });
};

export const changeCurrentLangAndSetTemplate = langSlug => (dispatch, getState) => {
  const state = getState();
  const currentText = selectors.currentPlayerTextByLangSelector(langSlug)(state);
  const { solution_template: template } = _.find(languages, { slug: langSlug });
  if (_.isUndefined(currentText)) {
    dispatch(sendEditorText(template, langSlug));
  } else {
    dispatch(sendEditorLang(langSlug));
  }
};

export const editorReady = () => (dispatch) => {
  initGameChannel(dispatch);
  channel.on('editor:text', ({ user_id: userId, editor_text: text }) => {
    dispatch(actions.updateEditorText({ userId, langSlug: 'js', text }));
  });

  channel.on('editor:lang', ({ user_id: userId, lang: langSlug }) => {
    const currentLang = _.find(languages, { slug: langSlug });
    dispatch(actions.updateEditorLang({ userId, currentLang }));
  });

  channel.on('user:joined', ({
    status,
    winner,
    first_player,
    second_player,
    first_player_editor_text,
    first_player_editor_lang,
    second_player_editor_text,
    second_player_editor_lang,
  }) => {
    // TODO: Add strong refactoring
    // const firstEditorLang = _.find(languages, { slug: first_player_editor_lang });
    // const secondEditorLang = _.find(languages, { slug: second_player_editor_lang });

    dispatch(actions.updateUsers({
      users: [{
        id: first_player.id,
        name: first_player.name,
        rating: first_player.rating,
        github_id: first_player.github_id,
        type: userTypes.firstPlayer,
      }, {
        id: second_player.id,
        name: second_player.name,
        rating: second_player.rating,
        github_id: second_player.github_id,
        type: userTypes.secondPlayer,
      }],
    }));

    dispatch(actions.updateEditorText({
      userId: first_player.id,
      text: first_player_editor_text,
      langSlug: first_player_editor_lang,
    }));

    if (second_player.id) {
      dispatch(actions.updateEditorText({
        userId: second_player.id,
        text: second_player_editor_text,
        langSlug: second_player_editor_lang,
      }));
    }

    dispatch(actions.updateGameStatus({ status, winner }));
  });

  channel.on('user:won', ({ winner, status, msg }) => {
    dispatch(actions.updateGameStatus({ status, winner }));
  });

  channel.on('give_up', ({ winner, status, msg }) => {
    dispatch(actions.updateGameStatus({ status, winner }));
  });
};

export const checkGameResult = () => (dispatch, getState) => {
  const state = getState();
  const currentUserId = selectors.currentUserIdSelector(state);
  const currentUserEditor = selectors.editorDataSelector(currentUserId)(state);

  // FIXME: create actions for this state transitions
  // FIXME: create statuses for solutionStatus
  dispatch(actions.updateGameStatus({ checking: true, solutionStatus: null }));

  const payload = {
    editor_text: currentUserEditor.text,
    lang: currentUserEditor.currentLang.slug,
  };

  channel.push('check_result', payload)
    .receive('ok', ({
      status, winner, solution_status: solutionStatus, output,
    }) => {
      const newGameStatus = solutionStatus ? { status, winner } : {};
      // !solutionStatus ? alert(output) : null;
      dispatch(actions.updateExecutionOutput({ output }));
      dispatch(actions.updateGameStatus({ ...newGameStatus, solutionStatus, checking: false }));
    });
};
