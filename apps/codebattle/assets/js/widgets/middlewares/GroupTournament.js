import { camelizeKeys } from "humps";

import { channelMethods, channelTopics } from "../../socket";
import { actions } from "../slices";

import Channel from "./Channel";

const channel = new Channel();

export const setTournamentChannel = (tournamentId) => {
  const newChannelName = `group_tournament:${tournamentId}`;
  return channel.setupChannel(newChannelName);
};

export const connectToTournament = (currentUserId) => (dispatch) => {
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
      logs,
      code,
      langSlug,
    } = normalizedResponse;

    console.log(normalizedResponse);
    console.log("group tournament join invite", invite);
    console.log("group tournament external setup", externalSetup);

    dispatch(
      actions.setGroupTournamentData({
        status,
        projectStatus,
        projectLink,
        invite,
        externalSetup,
        requireInvitation,
        solutionEvolution,
        logs,
        code,
        langSlug,
      }),
    );
  };

  channel.join().receive("ok", onJoinSuccess).receive("error", onJoinFailure);

  const handleRunUpdated = (response) => {
    const latestSolutionEntry = response.solution || null;
    const currentUserSolution =
      latestSolutionEntry && latestSolutionEntry.userId === currentUserId
        ? latestSolutionEntry
        : null;

    dispatch(
      actions.applyRunUpdate({
        groupTournament: response.groupTournament,
        run: response.run,
        latestSolutionEntry,
        solution: currentUserSolution,
      }),
    );

    if (response.run?.id) {
      dispatch(actions.addLog(`Run #${response.run.id} ${response.run.status}`));
    }
  };

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
