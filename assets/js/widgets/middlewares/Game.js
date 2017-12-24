import socket from '../../socket';
import getVar from '../../lib/phxVariables';
import { EditorActions, UserActions, GameActions } from '../redux/Actions';
import { currentUserIdSelector } from '../redux/UserRedux';
import { editorsSelector } from '../redux/EditorRedux';
import userTypes from '../config/userTypes';

const gameId = getVar('game_id');
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

    dispatch(UserActions.updateUsers([{
      id: first_player.id,
      name: first_player.name,
      raiting: first_player.raiting,
      type: userTypes.firstPlayer,
    }, {
      id: second_player.id,
      name: second_player.name,
      raiting: second_player.raiting,
      type: userTypes.secondPlayer,
    }]));

    dispatch(GameActions.updateStatus({ status, winner }));

    dispatch(GameActions.setTask(task));
    dispatch(EditorActions.updateEditorData(
      first_player.id,
      first_player_editor_text,
      first_player_editor_lang,
    ));
    dispatch(EditorActions.updateEditorData(
      second_player.id,
      second_player_editor_text,
      second_player_editor_lang,
    ));
  };

  channel.join().receive('ignore', () => console.log('Game channel: auth error'))
    .receive('error', () => console.log('Game channel: unable to join'))
    .receive('ok', onJoinSuccess);

  channel.onError(ev => console.log('Game channel: something went wrong', ev));
  channel.onClose(ev => console.log('Game channel: closed', ev));
};

// FIXME: rename sendEditorData to sendEditorText
export const sendEditorData = editorText => (dispatch, getState) => {
  const state = getState();
  const userId = currentUserIdSelector(state);
  dispatch(EditorActions.updateEditorText(userId, editorText));

  channel.push('editor:text', { editor_text: editorText });
};

export const sendEditorLang = lang => (dispatch, getState) => {
  const state = getState();
  const userId = currentUserIdSelector(state);
  dispatch(EditorActions.updateEditorLang(userId, lang));

  channel.push('editor:lang', { lang });
};

export const editorReady = () => (dispatch) => {
  initGameChannel(dispatch);
  channel.on('editor:text', ({ user_id: userId, editor_text: editorText }) => {
    dispatch(EditorActions.updateEditorText(userId, editorText));
  });

  channel.on('editor:lang', ({ user_id: userId, lang }) => {
    dispatch(EditorActions.updateEditorLang(userId, lang));
  });

  channel.on('user:joined', ({ status, winner, first_player, second_player }) => {
    dispatch(GameActions.updateStatus({ status, winner }));

    dispatch(UserActions.updateUsers([{
      id: first_player.id,
      name: first_player.name,
      raiting: first_player.raiting,
      type: userTypes.firstPlayer,
    }, {
      id: second_player.id,
      name: second_player.name,
      raiting: second_player.raiting,
      type: userTypes.secondPlayer,
    }]));
  });

  channel.on('user:won', ({ winner, status, msg }) => {
    dispatch(GameActions.updateStatus({ status, winner }));
    alert(msg);
  });
};

export const checkGameResult = () => (dispatch, getState) => {
  const state = getState();
  const currentUserId = currentUserIdSelector(state);
  const currentUserEditor = editorsSelector(state)[currentUserId];

  // FIXME: create actions for this state transitions
  // FIXME: create statuses for solutionStatus
  dispatch(GameActions.updateStatus({ checking: true, solutionStatus: null }));

  const payload = {
    editor_text: currentUserEditor.value,
    lang: currentUserEditor.currentLang,
  };

  channel.push('check_result', payload)
    .receive('ok', ({ status, winner, solution_status: solutionStatus }) => {
      const newGameStatus = solutionStatus ? { status, winner } : {};
      dispatch(GameActions.updateStatus({ ...newGameStatus, solutionStatus, checking: false }));
    });
};
