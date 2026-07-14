import { camelizeKeys } from 'humps';

import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';

import Channel from './Channel';

const channel = new Channel();

export const setTournamentChannel = (tournamentId: number | string) => {
  const newChannelName = `group_tournament:${tournamentId}`;
  return channel.setupChannel(newChannelName);
};

const applyInviteUpdate = (dispatch: any, payload: any) => {
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

export const submitSolution = (solution: string, lang: string) => (_dispatch: any) =>
  new Promise((resolve, reject) => {
    if (!channel) {
      console.error('Channel not initialized');
      reject(new Error('channel_not_initialized'));
      return;
    }

    channel
      .push('group_tournament:submit_solution', { solution, lang })
      .receive('ok', (data) => resolve(camelizeKeys(data)))
      .receive('error', (error) => {
        console.error('Submit solution failed', error);
        reject(error);
      })
      .receive('timeout', () => reject(new Error('timeout')));
  });

export const requestRunDetails = (runId: number) => (dispatch: any) => {
  if (!channel) {
    console.error('Channel not initialized');
    return;
  }

  channel
    .push('group_tournament:run:request', { runId })
    .receive('ok', (data: any) => {
      const normalizedData = camelizeKeys(data);
      dispatch(actions.applyRunDetails(normalizedData));
    })
    .receive('error', (error: any) => {
      console.error('Request run details failed', error);
    });
};

export const connectToTournament = (currentUserId: number) => (dispatch: any) => {
  if (!channel) {
    console.error('Channel not initialized');
    return;
  }

  const onJoinFailure = (payload: any) => {
    console.error(payload);
    window.location.reload();
  };

  channel.onError(() => {
    console.error('Something wrong');
  });

  const onJoinSuccess = (response: any) => {
    const normalizedResponse = camelizeKeys(response);

    const {
      status,
      projectStatus,
      projectLink,
      invite,
      externalSetup,
      solutionEvolution,
      requireInvitation,
      runOnExternalPlatform,
      platformError,
      code,
      langSlug,
      snapshot,
    } = normalizedResponse;

    dispatch(
      actions.setGroupTournamentData({
        status,
        projectStatus,
        projectLink,
        invite,
        externalSetup,
        requireInvitation,
        runOnExternalPlatform: runOnExternalPlatform ?? false,
        platformError,
        solutionEvolution,
        code,
        langSlug,
      }),
    );

    if (snapshot) {
      dispatch(actions.setData(snapshot));
    }
  };

  channel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);

  const handleRunUpdated = (response: any) => {
    if (currentUserId == null || response.userId !== currentUserId) {
      return;
    }

    dispatch(actions.applyRunStub(response));

    if (response.runId) {
      dispatch(actions.setActiveRunIdFromServer(response.runId));
    }
  };

  const handleInviteUpdated = (response: any) => {
    applyInviteUpdate(dispatch, response);
  };

  const handleStatusUpdated = (response: any) => {
    const normalizedData = camelizeKeys(response);
    dispatch(actions.updateGroupTournamentStatus(normalizedData.status));

    if (normalizedData.groupTournament) {
      dispatch(actions.mergeGroupTournament(normalizedData.groupTournament));
    }

    if (normalizedData.leaderboard) {
      dispatch(actions.setLeaderboard(normalizedData.leaderboard));
    }
  };

  channel.addListener('group_tournament:invite_updated', handleInviteUpdated);
  channel.addListener('group_tournament:status_updated', handleStatusUpdated);
  channel.addListener(channelTopics.groupTournamentRunUpdated, handleRunUpdated);

  return channel;
};

export const requestInviteUpdate = () => (dispatch: any) => {
  if (!channel) {
    console.error('Channel not initialized');
    return;
  }

  channel
    .push(channelMethods.requestInviteUpdate, {})
    .receive('ok', (data: any) => {
      applyInviteUpdate(dispatch, data);
    })
    .receive('error', (error: any) => {
      console.error('Request invite update failed', error);
    });
};

export const startGroupTournament = () => (dispatch: any) => {
  if (!channel) {
    console.error('Channel not initialized');
    return;
  }

  channel
    .push('start_group_tournament', {})
    .receive('ok', (data: any) => {
      const normalizedData = camelizeKeys(data);
      dispatch(actions.updateGroupTournamentStatus(normalizedData.status || 'active'));
    })
    .receive('error', (error: any) => {
      console.error('Start group tournament failed', error);
    });
};

const requestJson = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as Error & {
      response?: { data: any; status: number };
    };
    error.response = { data, status: response.status };
    throw error;
  }

  return camelizeKeys(data);
};

export const load = (groupTournamentId: number | string) => async (dispatch: any) => {
  try {
    const response = await requestJson(`/api/v1/group_tournaments/${groupTournamentId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token || '',
      },
    });

    dispatch(actions.setData(response));
  } catch (error) {
    console.error('group_tournament:load failed', error);
  }
};
