import Gon from 'gon';
import _ from 'lodash';
import { camelizeKeys, decamelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';
import getChatName from '../utils/names';
import { getSystemMessage } from '../utils/chat';

const isRecord = Gon.getAsset('is_record');

const channel = isRecord ? null : socket.channel(getChatName('channel'));

const fetchState = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', data => {
    const page = getChatName('page');
    const greetingMessage = getSystemMessage({
      text: `Joined channel: ${_.capitalize(page)}`,
      status: 'success',
    });
    const messages = [greetingMessage, ...data.messages];
    const updatedData = { ...data, page, messages };
    camelizeKeysAndDispatch(actions.updateChatData)(updatedData);
  });

  channel.on(
    'chat:user_joined',
    camelizeKeysAndDispatch(actions.userJoinedChat),
  );
  channel.on('chat:user_left', camelizeKeysAndDispatch(actions.userLeftChat));
  channel.on('chat:new_msg', camelizeKeysAndDispatch(actions.newChatMessage));
  channel.on('chat:user_banned', camelizeKeysAndDispatch(actions.banUserChat));
};

export const connectToChat = () => dispatch => {
  if (!isRecord) {
    dispatch(fetchState());
  }
};

export const addMessage = payload => {
  channel
    .push('chat:add_msg', decamelizeKeys(payload, { separator: '_' }))
    .receive('error', error => console.error(error));
};

export const pushCommand = command => {
  channel
    .push('chat:command', command)
    .receive('error', error => console.error(error));
};
