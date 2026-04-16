import { camelizeKeys } from "humps";

import { channelMethods } from "../../socket";
import { actions } from "../slices";

import Channel from "./Channel";

const channel = new Channel();

export const setTournamentChannel = (tournamentId) => {
  const newChannelName = `group_tournament:${tournamentId}`;
  return channel.setupChannel(newChannelName);
};

export const connectToTournament = () => (dispatch) => {
  if (!channel) {
    console.error("Channel not initialized");
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
      externalSetup,
      solutionEvolution,
      logs,
      code,
      langSlug,
    } = normalizedResponse;

    console.log("group tournament join invite", invite);
    console.log("group tournament external setup", externalSetup);

    dispatch(
      actions.setGroupTournamentData({
        status,
        projectStatus,
        projectLink,
        invite,
        externalSetup,
        solutionEvolution,
        logs,
        code,
        langSlug,
      }),
    );
  };

  channel.join().receive("ok", onJoinSuccess).receive("error", onJoinFailure);

  return channel;
};

export const requestInviteUpdate = () => (dispatch) => {
  if (!channel) {
    console.error("Channel not initialized");
    return;
  }

  channel
    .push(channelMethods.requestInviteUpdate, {})
    .receive("ok", (data) => {
      const normalizedData = camelizeKeys(data);
      const invite = normalizedData.invite;
      const externalSetup = normalizedData.externalSetup;

      dispatch(actions.updateInviteState(invite.state));

      if (invite.inviteLink) {
        dispatch(actions.updateInviteLink(invite.inviteLink));
      }

      if (externalSetup) {
        dispatch(actions.updateGroupTournamentData({ externalSetup }));
      }
    })
    .receive("error", (error) => {
      console.error("Request invite update failed", error);
    });
};
