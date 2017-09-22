import socket from '../../socket';
import getVar from '../../lib/phxVariables';
import { EditorActions, UserActions } from '../redux/Actions';
import { currentUserIdSelector } from '../redux/UserRedux'
import userTypes from '../config/userTypes';

const gameId = getVar('game_id');
const channelName = `game:${gameId}`;
const channel = socket.channel(channelName);

const initGameChannel = (dispatch) => {
  const onJoinSuccess = (response) => {
    const { first_player_id, second_player_id } = response;
    dispatch(UserActions.updateUsers([{
      id: first_player_id,
      type: userTypes.firstPlayer
    }, {
      id: second_player_id,
      type: userTypes.secondPlayer
    }]));
  }

  channel.join().receive('ignore', () => console.log('Game channel: auth error'))
                .receive('error', () => { console.log('Game channel: unable to join'); })
                .receive('ok', onJoinSuccess);

  channel.onError(ev => console.log('Game channel: something went wrong', ev));
  channel.onClose(ev => console.log('Game channel: closed', ev));
}

export const sendEditorData = editorText => (dispatch, getState) => {
  const state = getState();
  const userId = currentUserIdSelector(state);
  dispatch(EditorActions.updateEditorData(userId, editorText));

  channel.push('editor:data', { data: editorText });
}

export const editorReady = () => (dispatch) => {
  initGameChannel(dispatch);
  channel.on('editor:update', ({ user_id: userId, editor_text: editorText }) => {
    dispatch(EditorActions.updateEditorData(userId, editorText));
  });
}


