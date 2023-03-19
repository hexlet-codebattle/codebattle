import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';

const channel = socket.channel('invites');

const camelizeKeysAndDispatch = (dispatch, actionCreator) => data => (
  dispatch(actionCreator(camelizeKeys(data)))
);

export const initInvites = () => dispatch => {
  const onJoinSuccess = () => {
    channel.on('invites:init', camelizeKeysAndDispatch(dispatch, actions.setInvites));

    channel.on('invites:created', camelizeKeysAndDispatch(dispatch, actions.addInvite));
    channel.on('invites:canceled', camelizeKeysAndDispatch(dispatch, actions.updateInvite));
    channel.on('invites:applied', data => {
      window.location.href = `/games/${data.invite.game_id}`;
      camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
    });
    channel.on('invites:expired', camelizeKeysAndDispatch(dispatch, actions.updateInvite));
    channel.on('invites:dropped', camelizeKeysAndDispatch(dispatch, actions.updateInvite));
  };

  channel
    .join()
    .receive('ok', onJoinSuccess);
};

export const createInvite = params => dispatch => channel
  .push('invites:create', params)
  .receive('ok', camelizeKeysAndDispatch(dispatch, actions.addInvite));

export const acceptInvite = id => dispatch => channel
  .push('invites:accept', { id })
  .receive('ok', data => {
    window.location.href = `/games/${data.invite.game_id}`;
    camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
  });

export const declineInvite = id => dispatch => channel
  .push('invites:cancel', { id })
  .receive('ok', camelizeKeysAndDispatch(dispatch, actions.updateInvite));

export const cancelInvite = id => dispatch => channel
  .push('invites:cancel', { id })
  .receive('ok', camelizeKeysAndDispatch(dispatch, actions.updateInvite));
