import socket from '../../socket';
import getVar from '../../lib/phxVariables';
import { EditorActions, UserActions, GameActions } from '../redux/Actions';
import { currentUserIdSelector } from '../redux/UserRedux';
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
      first_player_editor_data,
      second_player_editor_data,
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

    dispatch(EditorActions.updateEditorData(first_player.id, first_player_editor_data));
    dispatch(EditorActions.updateEditorData(second_player.id, second_player_editor_data));
  };

  channel.join().receive('ignore', () => console.log('Game channel: auth error'))
                .receive('error', () => console.log('Game channel: unable to join'))
                .receive('ok', onJoinSuccess);

  channel.onError(ev => console.log('Game channel: something went wrong', ev));
  channel.onClose(ev => console.log('Game channel: closed', ev));
};

export const sendEditorData = editorText => (dispatch, getState) => {
  const state = getState();
  const userId = currentUserIdSelector(state);
  dispatch(EditorActions.updateEditorData(userId, editorText));

  channel.push('editor:data', { data: editorText });
};

export const editorReady = () => (dispatch) => {
  initGameChannel(dispatch);
  channel.on('editor:update', ({ user_id: userId, editor_text: editorText }) => {
    dispatch(EditorActions.updateEditorData(userId, editorText));
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
};
