import { createDraftSafeSelector } from "@reduxjs/toolkit";
import find from "lodash/find";
import get from "lodash/get";
import isUndefined from "lodash/isUndefined";

import moment from "moment";

import i18n from "../../i18n";
import BattleRoomViewModes from "../config/battleRoomViewModes";
import editorModes from "../config/editorModes";
import defaultEditorHeight from "../config/editorSettings";
import editorThemes from "../config/editorThemes";
import editorUserTypes from "../config/editorUserTypes";
import GameStateCodes from "../config/gameStateCodes";
import SubscriptionTypeCodes from "../config/subscriptionTypes";

import userTypes from "../config/userTypes";
import { replayerMachineStates } from "../machines/game";
import { makeEditorTextKey } from "../utils/gameRoom";

const logoSvg = "/assets/images/logo.svg";

export const currentUserIdSelector = (state) => state.user.currentUserId;

export const currentUserClanIdSelector = (state) =>
  state.user.users[state.user.currentUserId].clanId;

export const currentUserIsAdminSelector = (state) =>
  state.user.users[state.user.currentUserId].subscriptionType === SubscriptionTypeCodes.admin;
export const currentUserIsModeratorSelector = (state) =>
  state.user.users[state.user.currentUserId].subscriptionType === SubscriptionTypeCodes.moderator;
export const currentUserIsAdminOrModeratorSelector = (state) =>
  currentUserIsAdminSelector(state) || currentUserIsModeratorSelector(state);
export const currentUserIsPremiumSelector = (state) =>
  state.user.users[state.user.currentUserId].subscriptionType === SubscriptionTypeCodes.premium;

export const currentUserIsGuestSelector = (state) =>
  !!state.user.users[state.user.currentUserId].isGuest;

export const userByIdSelector = (userId) => (state) => state.user.users[userId];

export const userIsAdminSelector = (userId) => (state) =>
  state.user.users[userId]?.subscriptionType === SubscriptionTypeCodes.admin;

export const subscriptionTypeSelector = (state) =>
  currentUserIsAdminOrModeratorSelector(state)
    ? SubscriptionTypeCodes.admin
    : SubscriptionTypeCodes.premium;

export const isShowGuideSelector = (state) => !!state.gameUI.isShowGuide;

export const gameIdSelector = (state) => state.game.gameStatus.gameId;

export const gamePlayersSelector = (state) => state.game.players;

export const userIsGamePlayerSelector = (state) => {
  const players = gamePlayersSelector(state);
  const currentUserId = currentUserIdSelector(state);

  return Object.values(players || {}).some((item) => item.id === currentUserId);
};

export const singleBattlePlayerSelector = (state) => {
  const players = gamePlayersSelector(state) || [];
  const playersWithoutBot = Object.values(players).filter((player) => !player.isBot);

  if (playersWithoutBot.length !== 1) {
    return null;
  }

  return playersWithoutBot[0];
};

export const gamePlayerSelector = (id) => (state) => state.game.players[id];

export const firstPlayerSelector = (state) =>
  find(gamePlayersSelector(state), { type: userTypes.firstPlayer });

export const secondPlayerSelector = (state) =>
  find(gamePlayersSelector(state), { type: userTypes.secondPlayer });

export const opponentPlayerSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);
  return find(gamePlayersSelector(state), ({ id }) => id !== currentUserId);
};

const editorsMetaSelector = (state) => state.editor.meta;
export const editorTextsSelector = (state) => state.editor.text;
export const editorTextsHistorySelector = (state) => state.editor.textHistory;

export const gameStatusSelector = (state) => state.game.gameStatus;

export const gameLockedSelector = (state) => state.game.locked;

export const gameVisibleSelector = (state) => state.game.visible;

export const gameAwardSelector = (state) => state.game.award;

export const gameWaitTypeSelector = (state) => state.game.waitType;

export const getSolution = (playerId) => (state) => {
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);

  const { currentLangSlug } = meta;
  const text = editorTexts[makeEditorTextKey(playerId, currentLangSlug)];

  return {
    text,
    lang: currentLangSlug,
  };
};

export const editorsModeSelector = (state) => state.gameUI.editorMode || editorModes.default;

export const editorsThemeSelector = (state) => state.gameUI?.editorTheme || editorThemes.dark;

export const editorDataSelector = (playerId, roomMachineState) => (state) => {
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);
  const editorTextsHistory = editorTextsHistorySelector(state);

  if (!meta) {
    return null;
  }
  const text =
    roomMachineState && roomMachineState.matches({ replayer: replayerMachineStates.on })
      ? editorTextsHistory[playerId]
      : editorTexts[makeEditorTextKey(playerId, meta.currentLangSlug)];

  const currentLangSlug =
    roomMachineState &&
    roomMachineState.matches({
      replayer: replayerMachineStates.on,
    })
      ? meta.historyCurrentLangSlug
      : meta.currentLangSlug;

  return {
    ...meta,
    text,
    currentLangSlug,
  };
};

export const editorHeightSelector = (roomMachineState, playerId) => (state) => {
  const editorData = editorDataSelector(playerId, roomMachineState)(state);
  return get(editorData, "editorHeight", defaultEditorHeight);
};

export const editorTextHistorySelector = (state, { userId }) => state.editor.textHistory[userId];

export const editorLangHistorySelector = (state, { userId }) => state.editor.langsHistory[userId];

export const currentUserSelector = (state) => state.user.users[state.user.currentUserId];

export const firstEditorSelector = (state, roomMachineState) => {
  const playerId = firstPlayerSelector(state)?.id;
  return editorDataSelector(playerId, roomMachineState)(state);
};

export const secondEditorSelector = (state, roomMachineState) => {
  const playerId = secondPlayerSelector(state)?.id;
  return editorDataSelector(playerId, roomMachineState)(state);
};

export const leftEditorSelector = (roomMachineState) =>
  createDraftSafeSelector(
    (state) => state,
    (state) => {
      const currentUserId = currentUserIdSelector(state);
      const player = get(gamePlayersSelector(state), currentUserId, false);
      const editorSelector =
        !!player && player.type === userTypes.secondPlayer
          ? secondEditorSelector
          : firstEditorSelector;
      return editorSelector(state, roomMachineState);
    },
  );

export const rightEditorSelector = (roomMachineState) =>
  createDraftSafeSelector(
    (state) => state,
    (state) => {
      const currentUserId = currentUserIdSelector(state);
      const player = get(gamePlayersSelector(state), currentUserId, false);
      const editorSelector =
        !!player && player.type === userTypes.secondPlayer
          ? firstEditorSelector
          : secondEditorSelector;
      return editorSelector(state, roomMachineState);
    },
  );

export const currentPlayerTextByLangSelector = (lang) => (state) => {
  const userId = currentUserIdSelector(state);
  const editorTexts = editorTextsSelector(state);
  return editorTexts[makeEditorTextKey(userId, lang)];
};

export const userLangSelector = (userId) => (state) =>
  get(editorsMetaSelector(state)[userId], "currentLangSlug", null);

export const userGameHeadToHeadSelector = createDraftSafeSelector(
  (state) => state.game.gameStatus.headToHead,
  (headToHead) => ({
    winnerId: headToHead?.winnerId,
    players: headToHead?.players || [],
  }),
);

export const gameStatusTitleSelector = (state) => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.state) {
    case GameStateCodes.waitingOpponent:
      return i18n.t("%{state}", { state: i18n.t("Waiting for an opponent") });
    case GameStateCodes.playing:
      return i18n.t("%{state}", { state: i18n.t("Playing") });
    case GameStateCodes.gameOver:
      return i18n.t("%{state}", { state: gameStatus.msg });
    default:
      return "";
  }
};

export const gameTaskSelector = (state) => state.game.task;

export const editorLangsSelector = (state) => state.editor.langs;

export const langInputSelector = (state) => state.editor.langInput;

export const executionOutputSelector = (playerId, roomMachineState) => (state) =>
  roomMachineState && roomMachineState.matches({ replayer: replayerMachineStates.on })
    ? state.executionOutput.historyResults[playerId]
    : state.executionOutput.results[playerId];

export const firstExecutionOutputSelector = (roomMachineState) => (state) => {
  const playerId = firstPlayerSelector(state)?.id;
  return executionOutputSelector(playerId, roomMachineState)(state);
};

export const secondExecutionOutputSelector = (roomMachineState) => (state) => {
  const playerId = secondPlayerSelector(state)?.id;
  return executionOutputSelector(playerId, roomMachineState)(state);
};

export const leftExecutionOutputSelector = (roomMachineState) => (state) => {
  const currentUserId = currentUserIdSelector(state);
  const player = get(gamePlayersSelector(state), currentUserId, false);

  const outputSelector =
    player.type === userTypes.secondPlayer
      ? secondExecutionOutputSelector
      : firstExecutionOutputSelector;
  return outputSelector(roomMachineState)(state);
};

export const rightExecutionOutputSelector = (roomMachineState) => (state) => {
  const currentUserId = currentUserIdSelector(state);
  const player = get(gamePlayersSelector(state), currentUserId, false);

  const outputSelector =
    !!player && player.type === userTypes.secondPlayer
      ? firstExecutionOutputSelector
      : secondExecutionOutputSelector;
  return outputSelector(roomMachineState)(state);
};

export const singlePlayerExecutionOutputSelector = (roomMachineState) => (state) => {
  const player = singleBattlePlayerSelector(state);

  return player ? executionOutputSelector(player.id, roomMachineState)(state) : {};
};

export const infoPanelExecutionOutputSelector = (viewMode, roomMachineState) => (state) => {
  if (viewMode === BattleRoomViewModes.duel) {
    return leftExecutionOutputSelector(roomMachineState)(state);
  }

  if (viewMode === BattleRoomViewModes.single) {
    return singlePlayerExecutionOutputSelector(roomMachineState)(state);
  }

  throw new Error("Invalid view mode for battle room");
};

export const editorsPanelOptionsSelector = (viewMode, roomMachineState) => (state) => {
  const currentUserId = currentUserIdSelector(state);
  const editorsMode = editorsModeSelector(state);
  const theme = editorsThemeSelector(state);

  if (viewMode === BattleRoomViewModes.duel) {
    const leftEditor = leftEditorSelector(roomMachineState)(state);
    const rightEditor = rightEditorSelector(roomMachineState)(state);
    const leftUserId = leftEditor?.userId;
    const rightUserId = rightEditor?.userId;

    const leftUserType =
      currentUserId === leftUserId ? editorUserTypes.currentUser : editorUserTypes.player;
    const rightUserType =
      leftUserType === editorUserTypes.currentUser
        ? editorUserTypes.opponent
        : editorUserTypes.player;
    const leftEditorHeight = editorHeightSelector(roomMachineState, leftUserId)(state);
    const rightEditorHeight = editorHeightSelector(roomMachineState, rightUserId)(state);
    const rightOutput = rightExecutionOutputSelector(roomMachineState)(state);

    const leftEditorParams = {
      id: leftUserId,
      type: leftUserType,
      editorState: leftEditor,
      editorHeight: leftEditorHeight,
      theme,
      editorMode: editorsMode,
    };
    const rightEditorParams = {
      id: rightUserId,
      type: rightUserType,
      editorState: rightEditor,
      editorHeight: rightEditorHeight,
      theme,
      editorMode: editorModes.default,
      output: rightOutput,
    };

    return [leftEditorParams, rightEditorParams];
  }

  if (viewMode === BattleRoomViewModes.single) {
    const player = singleBattlePlayerSelector(state);

    if (!player) return [];

    const { id: userId } = player;
    const userType =
      currentUserId === userId ? editorUserTypes.currentUser : editorUserTypes.player;
    const editorState = editorDataSelector(userId, roomMachineState)(state);
    const editorHeight = editorHeightSelector(roomMachineState, userId)(state);

    const editorParams = {
      id: userId,
      type: userType,
      editorState,
      editorHeight,
      theme,
      editorMode: editorsMode,
    };

    return [editorParams];
  }

  throw new Error("Invalid view mode for battle room");
};

export const userRankingSelector = (userId) => (state) =>
  (state.tournament.ranking?.entries || []).find(({ id }) => id === userId);
export const tournamentIdSelector = (state) => state.tournament.id;

export const tournamentSelector = (state) => state.tournament;
export const tournamentAdminSelector = (state) => state.tournamentAdmin;

export const currentUserIsTournamentOwnerSelector = (state) =>
  state.tournament.creatorId === state.user.currentUserId;

export const currentUserCanModerateTournament = createDraftSafeSelector(
  currentUserIsAdminOrModeratorSelector,
  currentUserIsTournamentOwnerSelector,
  (isAdminOrModerator, isOwner) => isAdminOrModerator || isOwner,
);

export const tournamentHideResultsSelector = (state) => !state.tournament.showResults;

export const tournamentOwnerIdSelector = (state) => state.tournament.creatorId;

export const currentTournamentPlayerSelector = (state) => state.tournamentPlayer;

export const tournamentPlayersSelector = (state) => state.tournament.players;

export const tournamentMatchesSelector = (state) => state.tournament.matches;

export const usersInfoSelector = (state) => state.usersInfo;

export const chatUsersSelector = (state) => state.chat.users;

export const chatMessagesSelector = (state) => state.chat.messages;

export const chatChannelStateSelector = (state) => state.chat.channel.online;

export const chatHistoryMessagesSelector = (state) => state.chat.history.messages;

export const currentChatUserSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);

  return find(chatUsersSelector(state), { id: currentUserId });
};

export const taskDescriptionLanguageSelector = (state) => state.gameUI.taskDescriptionLanguage;

export const playbookStatusSelector = (state) => state.playbook.state;

export const playbookInitRecordsSelector = (state) => state.playbook.initRecords;

export const playbookRecordsSelector = (state) => state.playbook.records;

export const lobbyDataSelector = (state) => state.lobby;

export const usersStatsSelector = (state) => state.user.usersStats;

export const usersListSelector = (state) => state.user.usersRatingPage;

export const gameTypeSelector = (state) => state.game.gameStatus.type;

export const gameModeSelector = (state) => state.game.gameStatus.mode;

export const userSettingsSelector = (state) => state.user.settings;

export const gameUseChatSelector = (state) => state.game.useChat;

export const gameAlertsSelector = (state) => state.game.alerts;

export const isOpponentInGameSelector = (state) => {
  const findedUser = find(chatUsersSelector(state), {
    id: opponentPlayerSelector(state).id,
  });
  return !isUndefined(findedUser);
};

export const currentUserNameSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);
  if (!currentUserId) {
    return "Anonymous user";
  }
  return state.user.users[currentUserId].name;
};

export const activeGameSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);

  const getMyGame = (game) => game.players.some(({ id }) => id === currentUserId);

  return state.lobby.activeGames.find(getMyGame);
};

export const isModalShow = (state) => state.lobby.createGameModal.show;

export const isJoinGameModalShow = (state) => state.lobby.joinGameModal.show;

export const modalSelector = (state) => state.lobby.createGameModal;

export const completedGamesSelector = (state) => state.completedGames;

export const activeRoomSelector = (state) => state.chat.activeRoom;

export const roomsSelector = (state) => state.chat.rooms;

export const eventSelector = (state) => state.event.event;

export const eventTopLeaderboardSelector = (state) => state.event.topLeaderboard;

export const eventCommonLeaderboardSelector = (state) => state.event.commonLeaderboard;

export const eventUserSelector = (state) => state.event.userEvent;

export const reportsSelector = createDraftSafeSelector(
  (state) => state.reports.list,
  (state) => state.reports.showOnlyPendingReports,
  (list, showOnlyPendingReports) => {
    const sortedList = [...(list || [])].sort((r1, r2) => {
      if (r1.state === "pending" && r2.state === "pending") {
        return moment(r1.insertedAt).diff(moment(r2.insertedAt));
      }
      if (r1.state === "pending") {
        return -1;
      }
      if (r2.state === "pending") {
        return 1;
      }
      return 0;
    });

    return showOnlyPendingReports ? sortedList.filter((r) => r.state === "pending") : sortedList;
  },
);

export const selectDefaultAvatarUrl = () => logoSvg;

// Participant data selector
export const participantDataSelector = (state) => {
  const event = eventSelector(state);
  const userEvent = eventUserSelector(state);

  // Map event stages to the format needed by the dashboard
  const stages =
    event?.stages.map((eventStage) => {
      const userStage = userEvent?.stages.find((stage) => stage.slug === eventStage.slug);

      // Determine status based on event stage status and user participation
      const isStageAvailableForUser = !!(
        eventStage.status === "active" && ["pending", "started", null].includes(userStage?.status)
      );
      const isUserPassedStage = userStage?.entranceResult === "passed";
      const gamesCount = userStage?.gamesCount ? userStage.gamesCount : "-";
      const zeroWinsCount = gamesCount === "-" ? "-" : "0";
      const winsCount = userStage?.winsCount ? userStage.winsCount : zeroWinsCount;

      return {
        status: eventStage.status,
        userStatus: userStage?.status,
        tournamentId: userStage?.tournamentId,
        name: eventStage.name,
        dates: eventStage.dates,
        isStageAvailableForUser,
        isUserPassedStage,
        slug: eventStage.slug,
        placeInTotalRank: userStage?.placeInTotalRank ? userStage.placeInTotalRank : "-",
        placeInCategoryRank: userStage?.placeInCategoryRank ? userStage.placeInCategoryRank : "-",
        gamesCount,
        winsCount,
        timeSpent: userStage?.timeSpentInSeconds
          ? moment.utc(userStage.timeSpentInSeconds * 1000).format("HH:mm:ss")
          : "-",
        actionButtonText: eventStage.actionButtonText,
        confirmationText: eventStage.confirmationText,
        type: eventStage.type,
      };
    }) || [];

  return {
    stages,
  };
};
