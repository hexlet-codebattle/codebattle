import { camelizeKeys } from "humps";

import { channelMethods } from "../../socket";
import { actions } from "../slices";

import Channel from "./Channel";

const channel = new Channel();

export const setTournamentChannel = (tournamentId) => {
  const newChannelName = `group_tournament:${tournamentId}`;
  return channel.setupChannel(newChannelName);
}

export const connectToTournament = () => (dispatch) => {
  if (!channel) {
    console.error('Channel not initialized');
    return;
  }

  const onJoinFailure = (payload) => {
    console.error(payload);
    window.location.reload();
  };

  channel.onError(() => {
    console.error("Something wrong");
  });

  const onJoinSuccess = (response) => {
    const normalizedResponse = camelizeKeys(response);

    const {
      status,
      projectStatus,
      projectLink,
      invite,
      solutionEvolution,
      logs,
      code,
      langSlug,
    } = normalizedResponse;

    dispatch(
      actions.setGroupTournamentData({
        status,
        projectStatus,
        projectLink,
        invite,
        solutionEvolution,
        logs,
        code,
        langSlug,
      }),
    );
  }

  channel.join().receive("ok", onJoinSuccess).receive("error", onJoinFailure);

  return channel;
}

export const requestInviteUpdate = () => (dispatch) => {
  if (!channel) {
    console.error('Channel not initialized');
    return;
  }

  channel.push(channelMethods.requestInviteUpdate, {})
    .receive('ok', (data) => {
      const invite = data;

      dispatch(actions.updateInviteStatus(invite.state));

      if (invite.inviteLink) {
        dispatch(actions.updateInviteLink(invite.inviteLink));
      }
    })
    .receive('error', (error) => {
      console.error('Request invite update failed', error);
    });
};
