import Gon from "gon";
import { camelizeKeys } from "humps";

import { makeGameUrl } from "@/utils/urlBuilders";

import { channelMethods, channelTopics } from "../../socket";
import { actions } from "../slices";

import Channel from "./Channel";

const players = Gon.getAsset("players") || [];
const currentUser = Gon.getAsset("current_user") || {};

let channel;

const mapViewerStateToWeight = {
  online: 0,
  lobby: 1,
  task: 2,
  tournament: 3,
  watching: 4,
  playing: 5,
};

const getMajorState = (metas) =>
  metas.reduce(
    (state, item) =>
      mapViewerStateToWeight[state] > mapViewerStateToWeight[item.state] ? state : item.state,
    "online",
  );

const getUserStateByPath = () => {
  const { pathname } = document.location;

  if (pathname.startsWith("/tournament")) {
    return { state: "tournament" };
  }

  if (pathname.startsWith("/games")) {
    const state = players.some((player) => player.id === currentUser.id) ? "playing" : "watching";

    return {
      state,
    };
  }

  if (pathname === "/") {
    return {
      state: "lobby",
    };
  }

  if (pathname.startsWith("/tasks")) {
    return {
      state: "task",
    };
  }

  return { state: "online" };
};

const camelizeKeysAndDispatch = (dispatch, actionCreator) => (data) =>
  dispatch(actionCreator(camelizeKeys(data)));

const redirectToNewGame = (data) => (_dispatch, getState) => {
  const { followId, followPaused } = getState().gameUI;

  if (followId && !followPaused) {
    window.location.replace(makeGameUrl(data.activeGameId));
  }
};

const deployBannerId = "cb-deploy-handoff-banner";

const renderDeployBanner = (text, backgroundColor = "#2f3747") => {
  const existing = document.getElementById(deployBannerId);
  const el = existing || document.createElement("div");

  el.id = deployBannerId;
  el.textContent = text;
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.right = "0";
  el.style.zIndex = "2000";
  el.style.padding = "8px 12px";
  el.style.textAlign = "center";
  el.style.fontSize = "14px";
  el.style.color = "#ffffff";
  el.style.backgroundColor = backgroundColor;

  if (!existing) {
    document.body.appendChild(el);
  }
};

const removeDeployBanner = () => {
  const existing = document.getElementById(deployBannerId);

  if (existing) {
    existing.remove();
  }
};

const initPresence = (followId) => (dispatch) => {
  channel = new Channel("main", {
    ...getUserStateByPath(),
    path: document.location.pathname,
    followId,
  });
  channel.syncPresence((list) => {
    const updatedList = list.map((userInfo) => ({
      ...userInfo,
      currentState: getMajorState(userInfo.userPresence),
    }));
    dispatch(actions.syncPresenceList(updatedList));
  });

  channel.join().receive("ok", () => {
    camelizeKeysAndDispatch(dispatch, actions.syncPresenceList);
  });

  channel.onError(() => dispatch(actions.updateMainChannelState(false)));

  return channel
    .addListener("user:game_created", (data) => {
      camelizeKeysAndDispatch(dispatch, actions.setActiveGameId)(data);
      dispatch(redirectToNewGame(camelizeKeys(data)));
    })
    .addListener(channelTopics.tournamentActivated, (data) => {
      camelizeKeysAndDispatch(dispatch, actions.changeTournamentState)(data);
    })
    .addListener(channelTopics.tournamentCanceled, (data) => {
      camelizeKeysAndDispatch(dispatch, actions.changeTournamentState)(data);
    })
    .addListener(channelTopics.deployHandoffStarted, () => {
      renderDeployBanner("Deploy in progress. Reconnecting game session...");
    })
    .addListener(channelTopics.deployHandoffDone, () => {
      renderDeployBanner("Deploy finished. Syncing latest session...", "#3a8b3a");
      setTimeout(() => {
        removeDeployBanner();
        window.location.reload();
      }, 1200);
    })
    .addListener(channelTopics.deployHandoffFailed, () => {
      renderDeployBanner("Deploy handoff incomplete. Reconnecting...", "#b34d4d");
    })
    .addListener(channelTopics.mainRedirect, (data) => {
      console.log("[main_redirect] received", data);
      const { url } = camelizeKeys(data) || {};
      if (typeof url === "string" && url.length > 0) {
        window.location.href = url;
      }
    });
};

export const changePresenceState = (state) => () => {
  channel.push("change_presence_state", { state });
};

export const broadcastRedirect = (url, userIds, onSuccess, onError) => () => {
  channel
    .push("main:redirect", { url, userIds })
    .receive("ok", () => onSuccess && onSuccess())
    .receive("error", (payload) => onError && onError(payload));
};

export const fetchTournamentPlayerIds = (tournamentId, onSuccess, onError) => () => {
  channel
    .push("tournament:player_ids", { tournamentId })
    .receive("ok", (payload) => onSuccess && onSuccess(camelizeKeys(payload).userIds || []))
    .receive("error", (payload) => onError && onError(payload));
};

export const changePresenceUser = (user) => () => {
  channel.push("change_presence_user", { user });
};

export const banPlayer = (userId, tournamentId, onSuccess, onError) => () => {
  channel
    .push("user:ban", { userId, tournamentId })
    .receive("ok", onSuccess)
    .receive("error", onError);
};

export const changeReportStatus = (reportId, status) => (dispatch) => {
  channel
    .push("report:status:update", { reportId, status })
    .receive("ok", (payload) => {
      const report = camelizeKeys(payload.report);
      dispatch(actions.updateReport(report));
    })
    .receive("error", (payload) => {
      console.error(payload);
    });
};

export const followUser = (userId) => (dispatch, getState) => {
  channel.push("user:follow", { userId }).receive("ok", (payload) => {
    const data = camelizeKeys(payload);

    camelizeKeysAndDispatch(dispatch, actions.followUser)(data);

    if (!data.activeGameId) return;

    camelizeKeysAndDispatch(dispatch, actions.setActiveGameId)(data);

    if (data.activeGameId !== getState().game?.gameStatus?.gameId) {
      setTimeout(() => {
        window.location.replace(makeGameUrl(data.activeGameId));
      }, 1000);
    }
  });
};

export const unfollowUser = (userId) => (dispatch) => {
  channel
    .push("user:unfollow", { userId })
    .receive("ok", () => {
      camelizeKeysAndDispatch(dispatch, actions.unfollowUser)();
    })
    .receive("error", console.error);
};

export const pauseFollow = (userId) => () => {
  channel.push("user:unfollow", { userId }).receive("error", console.error);
};

export const reportOnPlayer = (playerId, gameId, onSuccess, onError) => (dispatch) => {
  channel
    .push(channelMethods.reportOnPlayer, { playerId, gameId })
    .receive("ok", (payload) => {
      dispatch(actions.addReport(payload.report));
      onSuccess();
    })
    .receive("error", (payload) => {
      console.error(payload);
      onError();
    });
};

export default initPresence;
