import Gon from 'gon';
import { camelizeKeys } from 'humps';
import socket from '../../socket';
import { actions } from '../slices';

const chatId = Gon.getAsset('game_id');
const isRecord = Gon.getAsset('is_record');
const tournamentId = Gon.getAsset('tournament_id');

const getChannelName = () => {
  if (tournamentId) {
    return `chat:t_${tournamentId}`;
  }
  if (chatId) {
    return `chat:g_${chatId}`;
  }

  return 'chat:lobby';
};

const channel = isRecord ? null : socket.channel(getChannelName());

const fetchState = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.updateChatData));

  channel.on(
    'chat:user_joined',
    camelizeKeysAndDispatch(actions.userJoinedChat),
  );
  channel.on('chat:user_left', camelizeKeysAndDispatch(actions.userLeftChat));
  channel.on('chat:new_msg', camelizeKeysAndDispatch(actions.newMessageChat));
  channel.on('chat:user_banned', camelizeKeysAndDispatch(actions.banUserChat));
};

export const connectToChat = () => dispatch => {
  if (!isRecord) {
    dispatch(fetchState());
  }
};

export const addMessage = message => {
  const payload = { text: message };

  channel
    .push('chat:add_msg', payload)
    .receive('error', error => console.error(error));
};

export const pushCommand = command => {
  channel
    .push('chat:command', command)
    .receive('error', error => console.error(error));
};
