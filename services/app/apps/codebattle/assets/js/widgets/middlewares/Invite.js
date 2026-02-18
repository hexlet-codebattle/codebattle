import { camelizeKeys } from "humps";

import { channelMethods, channelTopics } from "../../socket";
import { actions } from "../slices";
import { getSystemMessage } from "../utils/chat";

import Channel from "./Channel";

const channel = new Channel("invites");

const camelizeKeysAndDispatch = (dispatch, actionCreator) => (data) =>
  dispatch(actionCreator(camelizeKeys(data)));

const getRecipientName = (data) => data.invite.recipient.name;
const getCreatorName = (data) => data.invite.creator.name;
const getOpponentName = (data, userId) => {
  if (userId === data.invite.creatorId) {
    return getRecipientName(data);
  }

  if (userId === data.invite.recipientId) {
    return getCreatorName(data);
  }

  return "Anonymous";
};

export const initInvites = (currentUserId) => (dispatch) => {
  const onJoinSuccess = () => {
    channel.addListener(channelTopics.invitesInitTopic, (data) => {
      if (data.invites.length > 0) {
        const message = getSystemMessage({
          text: `You have (${data.invites.length}) invites to battle. Check `,
        });
        setTimeout(() => dispatch(actions.newChatMessage(message)), 100);
      }
      dispatch(actions.setInvites(data));
    });

    channel.addListener(channelTopics.invitesCreatedTopic, (data) => {
      if (data.invite.creatorId !== currentUserId) {
        const message = getSystemMessage({
          text: `You received battle invite (from ${getCreatorName(data)})`,
        });
        dispatch(actions.newChatMessage(message));
      }

      dispatch(actions.addInvite(data));
    });
    channel.addListener(channelTopics.invitesCanceledTopic, (data) => {
      if (data.invite.executorId !== currentUserId) {
        const message = getSystemMessage({
          text: `Invite has been canceled (Opponent ${getOpponentName(data, currentUserId)})`,
          status: "failure",
        });
        dispatch(actions.newChatMessage(message));
      }

      dispatch(actions.updateInvite(data));
    });
    channel.addListener(channelTopics.invitesAcceptedTopic, (data) => {
      if (data.invite.executorId !== currentUserId) {
        const message = getSystemMessage({
          text: `Invite has been accepted (Opponent ${getOpponentName(data, currentUserId)})`,
          status: "success",
        });
        dispatch(actions.newChatMessage(message));
      }
      setTimeout(() => {
        window.location.href = `/games/${data.invite.gameId}`;
      }, 250);

      dispatch(actions.updateInvite(data));
    });
    channel.addListener(channelTopics.invitesExpiredTopic, (data) => {
      const message = getSystemMessage({
        text: `Invite has been expired by timeout (${getCreatorName(data)} vs ${getRecipientName(data)})`,
        status: "failure",
      });
      dispatch(actions.newChatMessage(message));

      camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
    });
    channel.addListener(channelTopics.invitesDroppedTopic, (data) => {
      const message = getSystemMessage({
        text: `Invite has been dropped (${getCreatorName(data)} vs ${getRecipientName(data)})`,
        status: "failure",
      });
      dispatch(actions.newChatMessage(message));

      dispatch(actions.updateInvite(data));
    });
  };

  channel.join().receive("ok", onJoinSuccess);
};

export const createInvite = (params) => (dispatch) =>
  channel
    .push(channelMethods.invitesCreate, params)
    .receive("ok", (data) => {
      const message = getSystemMessage({
        text: `You invite ${data?.invite?.recipient?.name} to battle. Wait for his reply`,
      });
      dispatch(actions.newChatMessage(message));

      dispatch(actions.addInvite(data));
    })
    .receive("error", ({ reason }) => {
      throw new Error(reason);
    });

export const acceptInvite = (id) => (dispatch) =>
  channel
    .push(channelMethods.invitesAccept, { id })
    .receive("ok", (data) => {
      setTimeout(() => {
        window.location.href = `/games/${data.invite.gameId}`;
      }, 250);

      dispatch(actions.updateInvite(data));
    })
    .receive("error", ({ reason }) => {
      dispatch(actions.updateInvite({ id, state: "invalid" }));
      throw new Error(reason);
    });

export const declineInvite = (id, opponentName) => (dispatch) =>
  channel
    .push(channelMethods.invitesCancel, { id })
    .receive("ok", (data) => {
      const message = getSystemMessage({
        text: `You decline battle invite [Opponent ${opponentName}]`,
      });
      dispatch(actions.newChatMessage(message));

      camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
    })
    .receive("error", ({ reason }) => {
      dispatch(actions.updateInvite({ id, state: "invalid" }));
      throw new Error(reason);
    });

export const cancelInvite = (id, opponentName) => (dispatch) =>
  channel
    .push(channelMethods.invitesCancel, { id })
    .receive("ok", (data) => {
      const message = getSystemMessage({
        text: `You cancel battle invite [Opponent ${opponentName}]`,
      });
      dispatch(actions.newChatMessage(message));

      camelizeKeysAndDispatch(dispatch, actions.updateInvite)(data);
    })
    .receive("error", ({ reason }) => {
      dispatch(actions.updateInvite({ id, state: "invalid" }));
      throw new Error(reason);
    });
