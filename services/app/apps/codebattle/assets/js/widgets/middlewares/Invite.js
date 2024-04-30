import { camelizeKeys } from 'humps';

import socket, { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';

const channel = socket.channel('invites');

const camelizeKeysAndDispatch = (dispatch, actionCreator) => data => (
  dispatch(actionCreator(camelizeKeys(data)))
);

const getRecipientName = data => data.invite.recipient.name;
const getCreatorName = data => data.invite.creator.name;
const getOpponentName = (data, user) => {
  if (user.id === data.invite.creator_id) {
    return getRecipientName(data);
  }

  if (user.id === data.invite.recipient_id) {
    return getCreatorName(data);
  }

  return 'Anonymous';
};

export const initInvites = currentUser => dispatch => {
  const onJoinSuccess = () => {
    channel.on(channelTopics.invitesInitTopic, data => {
      if (data.invites.length > 0) {
        const message = getSystemMessage({ text: `You have (${data.invites.length}) invites to battle. Check ` });
        setTimeout(() => dispatch(actions.newChatMessage(message)), 100);
      }
      camelizeKeysAndDispatch(dispatch, actions.setInvites)(data);
    });

    channel.on(channelTopics.invitesCreatedTopic, data => {
      if (data.invite.creator_id !== currentUser.id) {
        const message = getSystemMessage({ text: `You received battle invite (from ${getCreatorName(data)})` });
        dispatch(actions.newChatMessage(message));
      }

      camelizeKeysAndDispatch(dispatch, actions.addInvite)(data);
    });
    channel.on(channelTopics.invitesCanceledTopic, data => {
      if (data.invite.executor_id !== currentUser.id) {
        const message = getSystemMessage({
          text: `Invite has been canceled (Opponent ${getOpponentName(data, currentUser)})`,
          status: 'failure',
        });
        dispatch(actions.newChatMessage(message));
      }

      camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
    });
    channel.on(channelTopics.invitesAcceptedTopic, data => {
      if (data.invite.executor_id !== currentUser.id) {
        const message = getSystemMessage({
          text: `Invite has been accepted (Opponent ${getOpponentName(data, currentUser)})`,
          status: 'success',
        });
        dispatch(actions.newChatMessage(message));
      }
      setTimeout(() => { window.location.href = `/games/${data.invite.game_id}`; }, 250);

      camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
    });
    channel.on(channelTopics.invitesExpiredTopic, data => {
      const message = getSystemMessage({
        text: `Invite has been expired by timeout (${getCreatorName(data)} vs ${getRecipientName(data)})`,
        status: 'failure',
      });
      dispatch(actions.newChatMessage(message));

      camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
    });
    channel.on(channelTopics.invitesDroppedTopic, data => {
      const message = getSystemMessage({
        text: `Invite has been dropped (${getCreatorName(data)} vs ${getRecipientName(data)})`,
        status: 'failure',
      });
      dispatch(actions.newChatMessage(message));

      camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
    });
  };

  channel
    .join()
    .receive('ok', onJoinSuccess);
};

export const createInvite = params => dispatch => channel
  .push(channelMethods.invitesCreate, params)
  .receive('ok', data => {
    const message = getSystemMessage({ text: `You invite ${params.recipient_name} to battle. Wait for his reply` });
    dispatch(actions.newChatMessage(message));

    camelizeKeysAndDispatch(dispatch, actions.addInvite)(data);
  })
  .receive('error', ({ reason }) => {
    throw new Error(reason);
  });

export const acceptInvite = id => dispatch => channel
  .push(channelMethods.invitesAccept, { id })
  .receive('ok', data => {
    setTimeout(() => { window.location.href = `/games/${data.invite.game_id}`; }, 250);

    camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
  })
  .receive('error', ({ reason }) => {
    camelizeKeysAndDispatch(dispatch, actions.updateInvite)({ id, state: 'invalid' });
    throw new Error(reason);
  });

export const declineInvite = (id, opponentName) => dispatch => channel
  .push(channelMethods.invitesCancel, { id })
  .receive('ok', data => {
    const message = getSystemMessage({ text: `You decline battle invite [Opponent ${opponentName}]` });
    dispatch(actions.newChatMessage(message));

    camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
  })
  .receive('error', ({ reason }) => {
    camelizeKeysAndDispatch(dispatch, actions.updateInvite)({ id, state: 'invalid' });
    throw new Error(reason);
  });

export const cancelInvite = (id, opponentName) => dispatch => channel
  .push(channelMethods.invitesCancel, { id })
  .receive('ok', data => {
    const message = getSystemMessage({ text: `You cancel battle invite [Opponent ${opponentName}]` });
    dispatch(actions.newChatMessage(message));

    camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
  })
  .receive('error', ({ reason }) => {
    camelizeKeysAndDispatch(dispatch, actions.updateInvite)({ id, state: 'invalid' });
    throw new Error(reason);
  });
