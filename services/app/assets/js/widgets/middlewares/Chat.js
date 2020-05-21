import Gon from 'gon';
import { camelizeKeys } from 'humps';
import socket from '../../socket';
import { actions } from '../slices';

const chatId = Gon.getAsset('game_id');
const isRecord = Gon.getAsset('is_record');
const channelName = `chat:${chatId}`;
const channel = !isRecord ? socket.channel(channelName) : null;

export const fetchState = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => (
    dispatch(actionCreator(camelizeKeys(data)))
  );

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.fetchChatData));

  channel.on('user:joined', camelizeKeysAndDispatch(actions.userJoinedChat));
  channel.on('user:left', camelizeKeysAndDispatch(actions.userLeftChat));
  channel.on('new:message', camelizeKeysAndDispatch(actions.newMessageChat));
};

export const addMessage = message => {
  const payload = { message };

  channel
    .push('new:message', payload)
    .receive('error', error => console.error(error));
};
