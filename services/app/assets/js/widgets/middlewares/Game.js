import _ from 'lodash';
import Gon from 'gon';
import socket from '../../socket';
import { editorsSelector, currentUserIdSelector } from '../selectors';
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
      first_player,
      second_player,
      first_player_editor_text,
      second_player_editor_text,
      first_player_editor_lang,
      second_player_editor_lang,
      task,
    } = response;

    const firstEditorLang = _.find(languages, { slug: first_player_editor_lang });
    const secondEditorLang = _.find(languages, { slug: second_player_editor_lang });

    const users = [{
      id: first_player.id,
      name: first_player.name,
      rating: first_player.rating,
      type: userTypes.firstPlayer,
    }];

    if (second_player.id) {
      users.push({
        id: second_player.id,
        name: second_player.name,
        rating: second_player.rating,
        type: userTypes.secondPlayer,
      });
    }

    dispatch(actions.updateUsers({ users }));

    dispatch(actions.updateEditorData({
      userId: first_player.id,
      text: first_player_editor_text,
      currentLang: firstEditorLang,
    }));

    if (second_player.id) {
      dispatch(actions.updateEditorData({
        userId: second_player.id,
        text: second_player_editor_text,
        currentLang: secondEditorLang,
      }));
    }

    dispatch(actions.setGameTask({ task }));
    dispatch(actions.updateGameStatus({ status, winner }));
    dispatch(actions.finishStoreInit());
  };

  channel.join().receive('ignore', () => console.log('Game channel: auth error'))
    .receive('error', () => console.log('Game channel: unable to join'))
    .receive('ok', onJoinSuccess);

  channel.onError(ev => console.log('Game channel: something went wrong', ev));
  channel.onClose(ev => console.log('Game channel: closed', ev));
};

export const sendEditorText = text => (dispatch, getState) => {
  const state = getState();
  const userId = currentUserIdSelector(state);
  dispatch(actions.updateEditorData({ userId, text }));

  channel.push('editor:text', { editor_text: text });
};

export const sendGiveUp = () => {
  channel.push('give_up');
};

export const sendEditorLang = langSlug => (dispatch, getState) => {
  const state = getState();
  const userId = currentUserIdSelector(state);
  const currentLang = _.find(languages, { slug: langSlug });

  dispatch(actions.updateEditorData({ userId, currentLang }));

  channel.push('editor:lang', { lang: langSlug });
};

export const editorReady = () => (dispatch) => {
  initGameChannel(dispatch);
  channel.on('editor:text', ({ user_id: userId, editor_text: text }) => {
    dispatch(actions.updateEditorData({ userId, text }));
  });

  channel.on('editor:lang', ({ user_id: userId, lang: langSlug }) => {
    const currentLang = _.find(languages, { slug: langSlug });
    dispatch(actions.updateEditorData({ userId, currentLang }));
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
    const firstEditorLang = _.find(languages, { slug: first_player_editor_lang });
    const secondEditorLang = _.find(languages, { slug: second_player_editor_lang });


    dispatch(actions.updateUsers({
      users: [{
        id: first_player.id,
        name: first_player.name,
        rating: first_player.rating,
        type: userTypes.firstPlayer,
      }, {
        id: second_player.id,
        name: second_player.name,
        rating: second_player.rating,
        type: userTypes.secondPlayer,
      }],
    }));

    dispatch(actions.updateEditorData({
      userId: first_player.id,
      text: first_player_editor_text,
      currentLang: firstEditorLang,
    }));

    if (second_player.id) {
      dispatch(actions.updateEditorData({
        userId: second_player.id,
        text: second_player_editor_text,
        currentLang: secondEditorLang,
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
  const currentUserId = currentUserIdSelector(state);
  const currentUserEditor = editorsSelector(state)[currentUserId];

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
