import { createDraftSafeSelector } from '@reduxjs/toolkit';
import find from 'lodash/find';
import get from 'lodash/get';
import isUndefined from 'lodash/isUndefined';

import moment from 'moment';

import type { RootState } from '@/slices';

import i18n from '../../i18n';
import BattleRoomViewModes from '../config/battleRoomViewModes';
import editorModes from '../config/editorModes';
import defaultEditorHeight from '../config/editorSettings';
import editorThemes from '../config/editorThemes';
import editorUserTypes from '../config/editorUserTypes';
import GameStateCodes from '../config/gameStateCodes';
import SubscriptionTypeCodes from '../config/subscriptionTypes';

import userTypes from '../config/userTypes';
import { replayerMachineStates } from '../machines/game';
import { makeEditorTextKey } from '../utils/gameRoom';

const logoSvg = '/assets/images/logo.svg';

export const currentUserIdSelector = (state: RootState) => state.user.currentUserId;

export const currentUserClanIdSelector = (state: RootState) =>
  state.user.users[state.user.currentUserId as number].clanId;

export const currentUserIsAdminSelector = (state: RootState) =>
  state.user.users[state.user.currentUserId as number].subscriptionType ===
  SubscriptionTypeCodes.admin;
export const currentUserIsModeratorSelector = (state: RootState) =>
  state.user.users[state.user.currentUserId as number].subscriptionType ===
  SubscriptionTypeCodes.moderator;
export const currentUserIsAdminOrModeratorSelector = (state: RootState) =>
  currentUserIsAdminSelector(state) || currentUserIsModeratorSelector(state);
export const currentUserIsPremiumSelector = (state: RootState) =>
  state.user.users[state.user.currentUserId as number].subscriptionType ===
  SubscriptionTypeCodes.premium;

export const currentUserIsGuestSelector = (state: RootState) =>
  !!state.user.users[state.user.currentUserId as number].isGuest;

export const currentUserIsBotSelector = (state: RootState) =>
  !!state.user.users[state.user.currentUserId as number]?.isBot;

export const userByIdSelector = (userId: number) => (state: RootState) => state.user.users[userId];

export const userIsAdminSelector = (userId: number) => (state: RootState) =>
  state.user.users[userId]?.subscriptionType === SubscriptionTypeCodes.admin;

export const subscriptionTypeSelector = (state: RootState) =>
  currentUserIsAdminOrModeratorSelector(state)
    ? SubscriptionTypeCodes.admin
    : SubscriptionTypeCodes.premium;

export const isShowGuideSelector = (state: RootState) => !!state.gameUI.isShowGuide;

export const gameIdSelector = (state: RootState) => state.game.gameStatus.gameId;

export const gamePlayersSelector = (state: RootState) => state.game.players;

export const userIsGamePlayerSelector = (state: RootState) => {
  const players = gamePlayersSelector(state);
  const currentUserId = currentUserIdSelector(state);

  return Object.values(players || {}).some((item) => item.id === currentUserId);
};

export const singleBattlePlayerSelector = (state: RootState) => {
  const players = gamePlayersSelector(state) || [];
  const playersWithoutBot = Object.values(players).filter((player) => !player.isBot);

  if (playersWithoutBot.length !== 1) {
    return null;
  }

  return playersWithoutBot[0];
};

export const gamePlayerSelector = (id: number) => (state: RootState) => state.game.players[id];

export const firstPlayerSelector = (state: RootState) =>
  find(gamePlayersSelector(state), { type: userTypes.firstPlayer });

export const secondPlayerSelector = (state: RootState) =>
  find(gamePlayersSelector(state), { type: userTypes.secondPlayer });

export const opponentPlayerSelector = (state: RootState) => {
  const currentUserId = currentUserIdSelector(state);
  return find(gamePlayersSelector(state), ({ id }) => id !== currentUserId);
};

const editorsMetaSelector = (state: RootState) => state.editor.meta;
export const editorTextsSelector = (state: RootState) => state.editor.text;
export const editorTextsHistorySelector = (state: RootState) => state.editor.textHistory;

export const gameStatusSelector = (state: RootState) => state.game.gameStatus;

export const gameLockedSelector = (state: RootState) => state.game.locked;

export const gameVisibleSelector = (state: RootState) => state.game.visible;

export const gameAwardSelector = (state: RootState) => state.game.award;

export const gameWaitTypeSelector = (state: RootState) => state.game.waitType;

export const getSolution = (playerId: number) => (state: RootState) => {
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);

  const { currentLangSlug } = meta;
  const text = editorTexts[makeEditorTextKey(playerId, currentLangSlug as string)];

  return {
    text,
    lang: currentLangSlug,
  };
};

export const editorsModeSelector = (state: RootState) =>
  state.gameUI.editorMode || editorModes.default;

export const editorsThemeSelector = (state: RootState) =>
  state.gameUI?.editorTheme || editorThemes.dark;

// roomMachineState is an xstate v4 machine state (no usable generic type)
export const editorDataSelector =
  (playerId: number, roomMachineState: any) => (state: RootState) => {
    const meta = editorsMetaSelector(state)[playerId];
    const editorTexts = editorTextsSelector(state);
    const editorTextsHistory = editorTextsHistorySelector(state);

    if (!meta) {
      return null;
    }
    const text =
      roomMachineState && roomMachineState.matches({ replayer: replayerMachineStates.on })
        ? editorTextsHistory[playerId]
        : editorTexts[makeEditorTextKey(playerId, meta.currentLangSlug as string)];

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

export const editorHeightSelector =
  (roomMachineState: any, playerId: number | undefined) => (state: RootState) => {
    const editorData = editorDataSelector(playerId as number, roomMachineState)(state);
    return get(editorData, 'editorHeight', defaultEditorHeight);
  };

export const editorTextHistorySelector = (state: RootState, { userId }: { userId: number }) =>
  state.editor.textHistory[userId];

export const editorLangHistorySelector = (state: RootState, { userId }: { userId: number }) =>
  state.editor.langsHistory[userId];

export const currentUserSelector = (state: RootState) =>
  state.user.users[state.user.currentUserId as number];

export const firstEditorSelector = (state: RootState, roomMachineState: any) => {
  const playerId = firstPlayerSelector(state)?.id;
  return editorDataSelector(playerId as number, roomMachineState)(state);
};

export const secondEditorSelector = (state: RootState, roomMachineState: any) => {
  const playerId = secondPlayerSelector(state)?.id;
  return editorDataSelector(playerId as number, roomMachineState)(state);
};

export const leftEditorSelector = (roomMachineState: any) =>
  createDraftSafeSelector(
    (state: RootState) => state,
    (state) => {
      const currentUserId = currentUserIdSelector(state);
      const player = get(gamePlayersSelector(state), currentUserId as number, false);
      const editorSelector =
        !!player && player.type === userTypes.secondPlayer
          ? secondEditorSelector
          : firstEditorSelector;
      return editorSelector(state, roomMachineState);
    },
  );

export const rightEditorSelector = (roomMachineState: any) =>
  createDraftSafeSelector(
    (state: RootState) => state,
    (state) => {
      const currentUserId = currentUserIdSelector(state);
      const player = get(gamePlayersSelector(state), currentUserId as number, false);
      const editorSelector =
        !!player && player.type === userTypes.secondPlayer
          ? firstEditorSelector
          : secondEditorSelector;
      return editorSelector(state, roomMachineState);
    },
  );

export const currentPlayerTextByLangSelector = (lang: string) => (state: RootState) => {
  const userId = currentUserIdSelector(state);
  const editorTexts = editorTextsSelector(state);
  return editorTexts[makeEditorTextKey(userId as number, lang)];
};

export const userLangSelector = (userId: number) => (state: RootState) =>
  get(editorsMetaSelector(state)[userId], 'currentLangSlug', null);

export const userGameHeadToHeadSelector = createDraftSafeSelector(
  (state: RootState) =>
    state.game.gameStatus.headToHead as
      | { winnerId?: number; players?: unknown[] }
      | null
      | undefined,
  (headToHead) => ({
    winnerId: headToHead?.winnerId,
    players: headToHead?.players || [],
  }),
);

export const gameStatusTitleSelector = (state: RootState) => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.state) {
    case GameStateCodes.waitingOpponent:
      return i18n.t('%{state}', { state: i18n.t('Waiting for an opponent') });
    case GameStateCodes.playing:
      return i18n.t('%{state}', { state: i18n.t('Playing') });
    case GameStateCodes.gameOver:
      return i18n.t('%{state}', { state: gameStatus.msg });
    default:
      return '';
  }
};

export const gameTaskSelector = (state: RootState) => state.game.task;

export const editorLangsSelector = (state: RootState) => state.editor.langs;

export const langInputSelector = (state: RootState) =>
  (state.editor as { langInput?: unknown }).langInput;

export const executionOutputSelector =
  (playerId: number, roomMachineState: any) => (state: RootState) =>
    roomMachineState && roomMachineState.matches({ replayer: replayerMachineStates.on })
      ? state.executionOutput.historyResults[playerId]
      : state.executionOutput.results[playerId];

export const firstExecutionOutputSelector = (roomMachineState: any) => (state: RootState) => {
  const playerId = firstPlayerSelector(state)?.id;
  return executionOutputSelector(playerId as number, roomMachineState)(state);
};

export const secondExecutionOutputSelector = (roomMachineState: any) => (state: RootState) => {
  const playerId = secondPlayerSelector(state)?.id;
  return executionOutputSelector(playerId as number, roomMachineState)(state);
};

export const leftExecutionOutputSelector = (roomMachineState: any) => (state: RootState) => {
  const currentUserId = currentUserIdSelector(state);
  const player = get(gamePlayersSelector(state), currentUserId as number, false);

  const outputSelector =
    player && (player as { type?: string }).type === userTypes.secondPlayer
      ? secondExecutionOutputSelector
      : firstExecutionOutputSelector;
  return outputSelector(roomMachineState)(state);
};

export const rightExecutionOutputSelector = (roomMachineState: any) => (state: RootState) => {
  const currentUserId = currentUserIdSelector(state);
  const player = get(gamePlayersSelector(state), currentUserId as number, false);

  const outputSelector =
    !!player && player.type === userTypes.secondPlayer
      ? firstExecutionOutputSelector
      : secondExecutionOutputSelector;
  return outputSelector(roomMachineState)(state);
};

export const singlePlayerExecutionOutputSelector =
  (roomMachineState: any) => (state: RootState) => {
    const player = singleBattlePlayerSelector(state);

    return player ? executionOutputSelector(player.id, roomMachineState)(state) : {};
  };

export const infoPanelExecutionOutputSelector =
  (viewMode: string, roomMachineState: any) => (state: RootState) => {
    if (viewMode === BattleRoomViewModes.duel) {
      return leftExecutionOutputSelector(roomMachineState)(state);
    }

    if (viewMode === BattleRoomViewModes.single) {
      return singlePlayerExecutionOutputSelector(roomMachineState)(state);
    }

    throw new Error('Invalid view mode for battle room');
  };

export const editorsPanelOptionsSelector =
  (viewMode: string, roomMachineState: any) => (state: RootState) => {
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

    throw new Error('Invalid view mode for battle room');
  };

export const userRankingSelector = (userId: number) => (state: RootState) =>
  (state.tournament.ranking?.entries || []).find(({ id }) => id === userId);
export const tournamentIdSelector = (state: RootState) => state.tournament.id;

export const tournamentSelector = (state: RootState) => state.tournament;
export const tournamentAdminSelector = (state: RootState) => state.tournamentAdmin;

export const currentUserIsTournamentOwnerSelector = (state: RootState) =>
  state.tournament.creatorId === state.user.currentUserId;

export const currentUserCanModerateTournament = createDraftSafeSelector(
  currentUserIsAdminOrModeratorSelector,
  currentUserIsTournamentOwnerSelector,
  (isAdminOrModerator, isOwner) => isAdminOrModerator || isOwner,
);

export const tournamentHideResultsSelector = (state: RootState) => !state.tournament.showResults;

export const tournamentOwnerIdSelector = (state: RootState) => state.tournament.creatorId;

export const currentTournamentPlayerSelector = (state: RootState) => state.tournamentPlayer;

export const tournamentPlayersSelector = (state: RootState) => state.tournament.players;

export const tournamentPlayerSelector = (playerId: number) => (state: RootState) =>
  (state.tournament.players as Record<number, unknown>)?.[playerId];

export const tournamentMatchesSelector = (state: RootState) => state.tournament.matches;

export const groupTournamentSelector = (state: RootState) => state.groupTournament;

export const usersInfoSelector = (state: RootState) => state.usersInfo;

export const chatUsersSelector = (state: RootState) => state.chat.users;

export const chatMessagesSelector = (state: RootState) => state.chat.messages;

export const chatChannelStateSelector = (state: RootState) => state.chat.channel.online;

export const chatHistoryMessagesSelector = (state: RootState) => state.chat.history.messages;

export const currentChatUserSelector = (state: RootState) => {
  const currentUserId = currentUserIdSelector(state);

  return find(chatUsersSelector(state), { id: currentUserId });
};

export const taskDescriptionLanguageSelector = (state: RootState) =>
  state.gameUI.taskDescriptionLanguage;

export const playbookStatusSelector = (state: RootState) => state.playbook.state;

export const playbookInitRecordsSelector = (state: RootState) => state.playbook.initRecords;

export const playbookRecordsSelector = (state: RootState) => state.playbook.records;

export const lobbyDataSelector = (state: RootState) => state.lobby;

export const usersStatsSelector = (state: RootState) => state.user.usersStats;

export const gameTypeSelector = (state: RootState) => state.game.gameStatus.type;

export const gameModeSelector = (state: RootState) => state.game.gameStatus.mode;

export const userSettingsSelector = (state: RootState) => state.user.settings;

export const gameUseChatSelector = (state: RootState) => state.game.useChat;

export const gameAlertsSelector = (state: RootState) => state.game.alerts;

export const isOpponentInGameSelector = (state: RootState) => {
  const findedUser = find(chatUsersSelector(state), {
    id: (opponentPlayerSelector(state) as { id: number }).id,
  });
  return !isUndefined(findedUser);
};

export const currentUserNameSelector = (state: RootState) => {
  const currentUserId = currentUserIdSelector(state);
  if (!currentUserId) {
    return 'Anonymous user';
  }
  return state.user.users[currentUserId].name;
};

export const activeGameSelector = (state: RootState) => {
  const currentUserId = currentUserIdSelector(state);

  const getMyGame = (game: { players: Array<{ id: number }> }) =>
    game.players.some(({ id }) => id === currentUserId);

  return state.lobby.activeGames.find(getMyGame);
};

export const isModalShow = (state: RootState) => state.lobby.createGameModal.show;

export const isJoinGameModalShow = (state: RootState) => state.lobby.joinGameModal.show;

export const modalSelector = (state: RootState) => state.lobby.createGameModal;

export const completedGamesSelector = (state: RootState) => state.completedGames;

export const activeRoomSelector = (state: RootState) => state.chat.activeRoom;

export const roomsSelector = (state: RootState) => state.chat.rooms;

interface EventDetails {
  loading?: string;
  slug?: string;
  stages?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export const eventSelector = (state: RootState) => state.event.event as EventDetails | undefined;

export const eventTopLeaderboardSelector = (state: RootState) => state.event.topLeaderboard;

export const eventCommonLeaderboardSelector = (state: RootState) => state.event.commonLeaderboard;

export const eventUserSelector = (state: RootState) => state.event.userEvent;

interface ReportItem {
  state?: string;
  insertedAt?: string;
  [key: string]: unknown;
}

export const reportsSelector = createDraftSafeSelector(
  (state: RootState) => state.reports.list as ReportItem[],
  (state: RootState) => state.reports.showOnlyPendingReports,
  (list, showOnlyPendingReports) => {
    const sortedList = [...(list || [])].sort((r1, r2) => {
      if (r1.state === 'pending' && r2.state === 'pending') {
        return moment(r1.insertedAt).diff(moment(r2.insertedAt));
      }
      if (r1.state === 'pending') {
        return -1;
      }
      if (r2.state === 'pending') {
        return 1;
      }
      return 0;
    });

    return showOnlyPendingReports ? sortedList.filter((r) => r.state === 'pending') : sortedList;
  },
);

export const selectDefaultAvatarUrl = () => logoSvg;

const formatDuration = (seconds: number) =>
  seconds > 0 ? moment.utc(seconds * 1000).format('HH:mm:ss') : '-';

export interface ParticipantStage {
  status?: string;
  userStatus?: string;
  tournamentId?: number | string;
  groupTournamentId?: number | string;
  tournamentFinished: boolean;
  groupTournamentFinished: boolean;
  name: string;
  dates?: string;
  isStageAvailableForUser: boolean;
  isUserPassedStage: boolean;
  slug: string;
  placeInTotalRank: number | string;
  placeInCategoryRank: number | string;
  gamesCount: number | string;
  winsCount: number | string;
  aiScore: number | string;
  maxScore: number | null;
  tournamentTimeSpent: string;
  groupTournamentTimeSpent: string;
  timeSpent: string;
  actionButtonText: string;
  confirmationText: string;
  nextRoundText?: string;
  type: string;
}

interface ParticipantData {
  stages: ParticipantStage[];
}

// Participant data selector.
// Event/userEvent shapes are dynamic server data (untyped), so stages are
// walked with `any` locally.
export const participantDataSelector = (state: RootState): ParticipantData => {
  const event = eventSelector(state) as any;
  const userEvent = eventUserSelector(state) as any;

  // Map event stages to the format needed by the dashboard
  const stages: ParticipantStage[] =
    event?.stages.map((eventStage: any): ParticipantStage => {
      const userStage = userEvent?.stages.find((stage: any) => stage.slug === eventStage.slug);

      // Determine status based on event stage status and user participation.
      // Entrance stages stay visible after the user's stage is completed so
      // we keep showing Passed/Not passed; tournament stages hide their CTA
      // once the user is done.
      const allowedUserStatuses =
        eventStage.type === 'entrance'
          ? ['pending', 'started', 'completed', null]
          : ['pending', 'started', null];
      const isStageAvailableForUser = !!(
        eventStage.status === 'active' && allowedUserStatuses.includes(userStage?.status)
      );
      const isUserPassedStage = userStage?.entranceResult === 'passed';
      const gamesCount = userStage?.gamesCount ? userStage.gamesCount : '-';
      const zeroWinsCount = gamesCount === '-' ? '-' : '0';
      const winsCount = userStage?.winsCount ? userStage.winsCount : zeroWinsCount;
      const tournamentSeconds = userStage?.timeSpentInSeconds || 0;
      const groupTournamentSeconds = userStage?.groupTournamentTimeSpentInSeconds || 0;
      const aiScoreRaw = userStage?.groupTournamentScore;
      const totalScoreRaw = userStage?.groupTournamentTotalScore;
      const tournamentId = userStage?.tournamentId || eventStage.tournamentId;
      const groupTournamentId = userStage?.groupTournamentId || eventStage.groupTournamentId;
      const isGlobalTournamentStage =
        eventStage.type === 'tournament' && eventStage.playingType === 'global';
      const hasConfiguredTournament = !isGlobalTournamentStage || !!tournamentId;

      return {
        status: eventStage.status,
        userStatus: userStage?.status,
        tournamentId,
        groupTournamentId,
        tournamentFinished: !!userStage?.tournamentFinished,
        groupTournamentFinished: !!userStage?.groupTournamentFinished,
        name: eventStage.name,
        dates: eventStage.dates,
        isStageAvailableForUser: isStageAvailableForUser && hasConfiguredTournament,
        isUserPassedStage,
        slug: eventStage.slug,
        placeInTotalRank: userStage?.placeInTotalRank ? userStage.placeInTotalRank : '-',
        placeInCategoryRank: userStage?.placeInCategoryRank ? userStage.placeInCategoryRank : '-',
        gamesCount,
        winsCount,
        aiScore: typeof aiScoreRaw === 'number' ? aiScoreRaw : '-',
        maxScore: typeof totalScoreRaw === 'number' ? totalScoreRaw : null,
        tournamentTimeSpent: formatDuration(tournamentSeconds),
        groupTournamentTimeSpent: formatDuration(groupTournamentSeconds),
        timeSpent: formatDuration(tournamentSeconds + groupTournamentSeconds),
        actionButtonText: eventStage.actionButtonText,
        confirmationText: eventStage.confirmationText,
        nextRoundText: eventStage.nextRoundText,
        type: eventStage.type,
      };
    }) || [];

  return {
    stages,
  };
};
