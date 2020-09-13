import Gon from 'gon';
import { camelizeKeys } from 'humps';
import socket from '../../socket';
import { actions } from '../slices';

const chatId = Gon.getAsset('game_id');
const isRecord = Gon.getAsset('is_record');
const tournamentId = Gon.getAsset('tournament_id');
const channelName = tournamentId
  ? `chat:t_${tournamentId}`
  : `chat:g_${chatId}`;

const channel = isRecord ? null : socket.channel(channelName);

export const fetchState = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.fetchChatData));

  channel.on('chat:user_joined', camelizeKeysAndDispatch(actions.userJoinedChat));
  channel.on('chat:user_left', camelizeKeysAndDispatch(actions.userLeftChat));
  channel.on('chat:new_msg', camelizeKeysAndDispatch(actions.newMessageChat));
};

export const addMessage = message => {
  const payload = { message };

  channel
    .push('chat:new_msg', payload)
    .receive('error', error => console.error(error));
};
