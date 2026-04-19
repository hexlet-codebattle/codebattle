import { camelizeKeys } from "humps";

import { channelMethods, channelTopics } from "../../socket";
import { actions } from "../slices";

import Channel from "./Channel";

const channel = new Channel();

export const setTournamentChannel = (tournamentId) => {
  const newChannelName = `group_tournament:${tournamentId}`;
  return channel.setupChannel(newChannelName);
};

const applyInviteUpdate = (dispatch, payload) => {
  const normalizedData = camelizeKeys(payload);
  const invite = normalizedData.invite;
  const externalSetup = normalizedData.externalSetup;
  const platformError = normalizedData.platformError || null;

  dispatch(actions.updateInviteState(invite.state));

  if (invite.inviteLink) {
    dispatch(actions.updateInviteLink(invite.inviteLink));
  }

  dispatch(actions.updateGroupTournamentData({ externalSetup, platformError }));
};

export const requestRunDetails = (runId) => (dispatch) => {
  if (!channel) {
    console.error("Channel not initialized");
    return;
  }

  channel
    .push("group_tournament:run:request", { runId })
    .receive("ok", (data) => {
      const normalizedData = camelizeKeys(data);
      dispatch(actions.applyRunDetails(normalizedData));
    })
    .receive("error", (error) => {
      console.error("Request run details failed", error);
    });
};

export const connectToTournament = (_currentUserId) => (dispatch) => {
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
      requireInvitation,
      platformError,
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
        externalSetup,
        requireInvitation,
        platformError,
        solutionEvolution,
        logs,
        code,
        langSlug,
      }),
    );
  };

  channel.join().receive("ok", onJoinSuccess).receive("error", onJoinFailure);

  const handleRunUpdated = (response) => {
    dispatch(actions.applyRunStub(response));

    if (response.runId) {
      dispatch(actions.addLog(`Run #${response.runId}`));
    }
  };

  const handleInviteUpdated = (response) => {
    applyInviteUpdate(dispatch, response);
  };

  channel.addListener("group_tournament:invite_updated", handleInviteUpdated);
  channel.addListener(channelTopics.groupTournamentRunUpdated, handleRunUpdated);

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
      applyInviteUpdate(dispatch, data);
    })
    .receive("error", (error) => {
      console.error("Request invite update failed", error);
    });
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.response = { data, status: response.status };
    throw error;
  }

  return camelizeKeys(data);
};

export const load = (groupTournamentId) => async (dispatch) => {
  const response = await requestJson(`/api/v1/group_tournaments/${groupTournamentId}`, {
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": window.csrf_token,
    },
  });
  console.log(response);

  dispatch(actions.setData(response));
};
