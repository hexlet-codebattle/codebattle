import { Presence } from 'phoenix';
import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';

const { id: currentUserId } = Gon.getAsset('current_user');
const channel = socket.channel(`main:${currentUserId}`);
const presence = new Presence(channel);

const listBy = (id, { metas: [first, ...rest] }) => {
  first.count = rest.length + 1;
  first.id = Number(id);
  return first;
};

export const init = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => (
    dispatch(actionCreator(camelizeKeys(data)))
  );

  presence.onSync(() => {
    const list = presence.list(listBy);
    camelizeKeysAndDispatch(actions.syncPresenceList)(list);
  });

  const onJoinSuccess = () => {
    channel.on('invites:init', camelizeKeysAndDispatch(actions.setInvites));
    channel.on('invites:canceled', camelizeKeysAndDispatch(actions.updateInvites));
    channel.on('invites:created', camelizeKeysAndDispatch(actions.addInvites));
    channel.on('invites:applied', camelizeKeysAndDispatch(actions.updateInvites));
  };

  channel
    .join()
    .receive('ok', onJoinSuccess);
};

export const createInvite = params => channel.push('invites:create', params);

export const acceptInvite = id => channel.push('invites:accept', { id });

export const declineInvite = id => channel.push('invites:decline', { id });

export const cancelInvite = id => channel.push('invites:cancel', { id });
