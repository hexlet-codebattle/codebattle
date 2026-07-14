import NiceModal from '@ebay/nice-modal-react';
import { camelizeKeys } from 'humps';
import debounce from 'lodash/debounce';

import ModalCodes from '@/config/modalCodes';
import { getPageProp } from '@/inertia/pageProps';
import { makeGameUrl } from '@/utils/urlBuilders';

import { channelMethods, channelTopics } from '../../socket';
import GameRoomModes from '../config/gameModes';
import GameStateCodes from '../config/gameStateCodes';
import PlaybookStatusCodes from '../config/playbookStatusCodes';
import { parse, getFinalState, getText, resolveDiffs, resolveRealtimeDiffs } from '../lib/player';
import * as selectors from '../selectors';
import { actions, redirectToNewGame } from '../slices';
import {
  getGamePlayers,
  getGameStatus,
  getPlayersExecutionData,
  getPlayersText,
} from '../utils/gameRoom';
import notification from '../utils/notification';

import Channel from './Channel';

const defaultLanguages = getPageProp<Array<{ slug: string; solutionTemplate: string }>>(
  'langs',
  [],
);
const gameId = getPageProp<number | undefined>('game_id');
const isRecord = getPageProp('is_record', false);
const channel = new Channel();
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

  return data;
};

export const setGameChannel = (newGameId = gameId) => {
  const newChannelName = `game:${newGameId}`;
  return channel.setupChannel(!isRecord && newGameId ? newChannelName : undefined);
};

const initEditors = (dispatch: any) => (playbookStatusCode: string, players: any[]) => {
  const isHistory = playbookStatusCode === PlaybookStatusCodes.stored;
  const updateEditorTextAction = isHistory
    ? actions.updateEditorTextHistory
    : actions.updateEditorText;
  const updateExecutionOutputAction = isHistory
    ? actions.updateExecutionOutputHistory
    : actions.updateExecutionOutput;

  players.forEach((player: any) => {
    const editorData = getPlayersText(player);
    const executionOutputData = getPlayersExecutionData(player);

    dispatch(updateEditorTextAction(editorData as any));

    dispatch(updateExecutionOutputAction(executionOutputData as any));
  });
};

const updateStore =
  (dispatch: any) =>
  ({
    firstPlayer,
    secondPlayer,
    task,
    langs,
    gameStatus,
    playbookStatusCode,
    award,
    visible,
    locked,
  }: any) => {
    const players = getGamePlayers([firstPlayer, secondPlayer]);

    dispatch(actions.setAward(award));
    dispatch(actions.setVisible(visible));
    dispatch(actions.setLocked(locked));

    dispatch(actions.setLangs({ langs }));
    dispatch(actions.updateGamePlayers({ players: players as any }));

    initEditors(dispatch)(playbookStatusCode, players);

    if (task) {
      dispatch(actions.setGameTask({ task }));
    }

    if (gameStatus) {
      dispatch(actions.updateGameStatus(gameStatus));
    }
  };

const initStoredGame = (dispatch: any) => (data: any) => {
  const mode = GameRoomModes.history;

  const gameStatus = {
    state: GameStateCodes.stored,
    type: data.type,
    mode,
    tournamentId: data.tournamentId,
  };

  updateStore(dispatch)({
    firstPlayer: data.players[0],
    secondPlayer: data.players[1],
    task: data.task,
    gameStatus,
    locked: data.locked,
    visible: true,
    award: data.award,
    awardStatus: 'idle',
    playbookStatusCode: PlaybookStatusCodes.stored,
  });

  dispatch(actions.loadPlaybook(data));
  dispatch(actions.updateChatData(data.chat));
};

const initPlaybook = (dispatch: any) => (data: any) => {
  initEditors(dispatch)(PlaybookStatusCodes.stored, data.players);

  dispatch(actions.loadPlaybook(data));
};

const initGameChannel = (gameRoomService: any) => (dispatch: any) => {
  const onJoinFailure = (payload: any) => {
    gameRoomService.send('REJECT_LOADING_GAME', { payload });
    gameRoomService.send('FAILURE_JOIN', { payload });
    window.location.reload();
  };

  channel.onError(() => {
    gameRoomService.send('FAILURE');
  });

  const onJoinSuccess = (response: any) => {
    const normalizedResponse = camelizeKeys(response);

    if (normalizedResponse.error) {
      console.error(normalizedResponse.error);
      return;
    }

    const {
      game: {
        players: [firstPlayer, secondPlayer],
        task,
        langs,
        locked,
        award,
      },
      activeGameId,
      tournament,
    } = normalizedResponse;

    const gameStatus = getGameStatus(normalizedResponse.game);

    gameRoomService.send('LOAD_GAME', { payload: gameStatus });

    if (activeGameId) {
      dispatch(actions.setActiveGameId({ activeGameId }));
    }

    if (tournament) {
      dispatch(
        actions.setTournamentData({
          ...tournament,
          matches: {},
          players: {},
        }),
      );
    }

    updateStore(dispatch)({
      firstPlayer,
      secondPlayer,
      task,
      langs,
      gameStatus,
      award,
      visible: true,
      locked,
      playbookStatusCode: PlaybookStatusCodes.active,
    });
  };

  channel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);
};

export const updateEditorText =
  (editorText: string, langSlug: string | null = null) =>
  (dispatch: any, getState: any) => {
    const state = getState();
    const userId: any = selectors.currentUserIdSelector(state);
    const currentLangSlug: any = langSlug || selectors.userLangSelector(userId)(state);
    dispatch(
      actions.updateEditorText({
        userId,
        editorText,
        langSlug: currentLangSlug,
      }),
    );
  };

export const sendEditorLang = (langSlug: string) => (_dispatch: any, getState: any) => {
  const state = getState();
  const userId: any = selectors.currentUserIdSelector(state);
  const currentLangSlug = langSlug || selectors.userLangSelector(userId)(state);

  channel.push(channelMethods.editorLang, {
    langSlug: currentLangSlug,
  });
};

export const sendEditorText =
  (editorText: string, langSlug: string | null = null) =>
  (_dispatch: any, getState: any) => {
    const state = getState();
    const userId: any = selectors.currentUserIdSelector(state);
    const currentLangSlug = langSlug || selectors.userLangSelector(userId)(state);

    channel.push(channelMethods.editorData, {
      editorText,
      langSlug: currentLangSlug,
    });
  };

export const sendEditorSummary =
  (summary: any, langSlug: string | null = null) =>
  (_dispatch: any, getState: any) => {
    if (!summary || typeof summary !== 'object') {
      return;
    }

    const state = getState();
    const userId: any = selectors.currentUserIdSelector(state);
    const currentLangSlug = langSlug || selectors.userLangSelector(userId)(state);

    try {
      channel.push(channelMethods.editorSummary, {
        summary,
        langSlug: currentLangSlug,
      });
    } catch {
      // Channel may have been torn down (e.g. unmount cleanup after navigation) —
      // swallow so we don't crash the React cleanup path.
    }
  };

// TODO: only for show tournament
export const startRoundTournament = () => {
  channel.push('tournament:start_round', {});
};

export const sendEditorCursorPosition = (offset: number) => {
  channel.push(channelMethods.editorCursorPosition, { offset });
};

export const sendEditorCursorSelection = (startOffset: number, endOffset: number) => {
  channel.push(channelMethods.editorCursorSelection, {
    startOffset,
    endOffset,
  });
};

export const sendEditorScrollPosition = (scrollTop: number, scrollLeft: number) => {
  channel.push(channelMethods.editorScrollPosition, {
    scrollTop,
    scrollLeft,
  });
};

export const sendPassCode =
  (passCode: string, onError: (error: any) => void) => (dispatch: any) => {
    channel
      .push(channelMethods.enterPassCode, { passCode })
      .receive('ok', () => {
        dispatch(actions.setLocked(false));
      })
      .receive('error', (error: any) => {
        onError({ message: error.reason });
      });
  };

export const sendGiveUp = () => {
  channel.push(channelMethods.giveUp, {});
};

export const sendOfferToRematch = () => {
  channel.push(channelMethods.rematchSendOffer, {});
};

export const sendRejectToRematch = () => {
  channel.push(channelMethods.rematchRejectOffer, {});
};

export const sendAcceptToRematch = () => {
  channel.push(channelMethods.rematchAcceptOffer, {});
};

export const sendReportOnUser =
  (userId: number, onSuccess: (data: any) => void, onError: (error: any) => void) =>
  (dispatch: any) => {
    const payload = { user_id: userId, reason: 'cheat', comment: '' };

    requestJson(`/api/v1/games/${gameId}/user_game_reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token || '',
      },
      body: JSON.stringify(payload),
    })
      .then((data: any) => {
        onSuccess(camelizeKeys(data));
      })
      .catch((error: any) => {
        onError(error);

        dispatch(actions.setError(error));
        console.error(error);
      });
  };

export const sendCurrentLangAndSetTemplate =
  (langSlug: string) => (dispatch: any, getState: any) => {
    const state = getState();
    const langs = (selectors.editorLangsSelector(state) ||
      defaultLanguages) as typeof defaultLanguages;
    const currentText = selectors.currentPlayerTextByLangSelector(langSlug)(state) as
      | string
      | undefined;
    const { solutionTemplate: template } = langs.find((lang) => lang.slug === langSlug)!;
    const textToSet = currentText || template;

    const userId: any = selectors.currentUserIdSelector(state);
    const newLangSlug: any = langSlug || selectors.userLangSelector(userId)(state);

    dispatch(
      actions.updateEditorText({
        userId,
        editorText: textToSet,
        langSlug: newLangSlug,
      }),
    );

    dispatch(sendEditorText(textToSet, langSlug));
    dispatch(sendEditorLang(langSlug));
  };

export const resetTextToTemplateAndSend = (langSlug: string) => (dispatch: any, getState: any) => {
  const state = getState();
  const langs = (selectors.editorLangsSelector(state) ||
    defaultLanguages) as typeof defaultLanguages;
  const { solutionTemplate: template } = langs.find((lang) => lang.slug === langSlug)!;
  dispatch(updateEditorText(template, langSlug));
  dispatch(sendEditorText(template, langSlug));
};

export const soundNotification = notification();

export const addCursorListeners = (
  params: { roomMode: string; userId: number },
  onChangePosition: (offset: number) => void,
  onChangeSelection: (startOffset: number, endOffset: number) => void,
  onChangeScroll: (scrollTop: number, scrollLeft: number) => void,
) => {
  const { roomMode, userId } = params;

  const isHistory = roomMode === GameRoomModes.history;

  const canReceivedRemoteCursor = !isHistory && !!userId && !isRecord;

  if (!canReceivedRemoteCursor) {
    return () => {};
  }

  const handleNewCursorPosition = debounce((data: any) => {
    const { offset } = data;
    if (userId === data.userId) {
      onChangePosition(offset);
    }
  }, 80);

  const handleNewCursorSelection = debounce((data: any) => {
    const { startOffset, endOffset } = data;
    if (userId === data.userId) {
      onChangeSelection(startOffset, endOffset);
    }
  }, 200);

  const handleNewScrollPosition = debounce((data: any) => {
    const { scrollTop, scrollLeft } = data;
    if (userId === data.userId && typeof onChangeScroll === 'function') {
      onChangeScroll(scrollTop, scrollLeft);
    }
  }, 80);

  const listenerParams = { userId };

  channel
    .addListener(channelTopics.editorCursorPositionTopic, handleNewCursorPosition, listenerParams)
    .addListener(channelTopics.editorCursorSelectionTopic, handleNewCursorSelection, listenerParams)
    .addListener(channelTopics.editorScrollPositionTopic, handleNewScrollPosition, listenerParams);

  return () => {
    if (channel) {
      channel
        .removeListeners(channelTopics.editorCursorPositionTopic, listenerParams)
        .removeListeners(channelTopics.editorCursorSelectionTopic, listenerParams)
        .removeListeners(channelTopics.editorScrollPositionTopic, listenerParams);
    }
  };
};

export const activeEditorReady = (service: any, isBanned: boolean) => {
  const listenerParams = { userId: service.machine.context.userId };

  if (isBanned) {
    service.send('load_banned_editor');
  } else {
    service.send('load_active_editor');
  }

  // channel.on('editor:data', data => {
  //   const { userId } = data;
  //   service.send('typing', { userId });
  // });

  const handleUserBanned = (data: any) => {
    service.send('banned_user', data);
  };

  const handleUserUnbanned = (data: any) => {
    service.send('unbanned_user', data);
  };

  const handleStartsCheck = (data: any) => {
    service.send('check_solution_received', data);
  };

  const handleNewCheckResult = (data: any) => {
    service.send('receive_check_result', data);
  };

  channel
    .addListener(channelTopics.userBanned, handleUserBanned)
    .addListener(channelTopics.userUnbanned, handleUserUnbanned)
    .addListener(channelTopics.userStartCheckTopic, handleStartsCheck)
    .addListener(channelTopics.userCheckCompleteTopic, handleNewCheckResult);

  return () => {
    channel
      .removeListeners(channelTopics.userBanned, listenerParams)
      .removeListeners(channelTopics.userUnbanned, listenerParams)
      .removeListeners(channelTopics.userStartCheckTopic, listenerParams)
      .removeListeners(channelTopics.userCheckCompleteTopic, listenerParams);
  };
};

export const activeGameReady =
  (gameRoomService: any, { cancelRedirect = false }: { cancelRedirect?: boolean }) =>
  (dispatch: any) => {
    initGameChannel(gameRoomService)(dispatch);

    const handleNewEditorData = (data: any) => {
      dispatch(actions.updateEditorText(data));
    };

    const handleStartsCheck = ({ user_id: userId }: any) => {
      dispatch(actions.updateCheckStatus({ [userId]: true }));
    };

    const handleGameHeadToHead = (data: any) => {
      dispatch(actions.setGameHeadToHead(data));
    };

    const handleNewCheckResult = (responseData: any) => {
      const { state, solutionStatus, checkResult, players, userId, award } = responseData;
      if (solutionStatus) {
        channel
          .push(channelMethods.gameHeadToHead, {})
          .receive('ok', (data: any) => dispatch(actions.setGameHeadToHead(data)));
      }
      dispatch(actions.updateGamePlayers({ players }));

      dispatch(
        actions.updateExecutionOutput({
          ...checkResult,
          userId,
        }),
      );
      dispatch(actions.updateGameStatus({ state, solutionStatus }));
      dispatch(actions.updateCheckStatus({ [userId]: false }));

      const payload = { state, award };
      gameRoomService.send(channelTopics.userCheckCompleteTopic, { payload });
    };

    const handleUserJoined = (data: any) => {
      const { state, startsAt, timeoutSeconds, langs, players, task } = data;

      const gamePlayers: any[] = getGamePlayers(players);
      const [firstPlayer, secondPlayer] = gamePlayers;

      soundNotification.start();
      dispatch(actions.updateGamePlayers({ players: gamePlayers }));
      dispatch(actions.setGameTask({ task }));
      dispatch(actions.setLangs({ langs }));

      dispatch(
        actions.updateEditorText({
          userId: firstPlayer.id,
          editorText: firstPlayer.editorText,
          langSlug: firstPlayer.editorLang,
        }),
      );

      dispatch(
        actions.updateExecutionOutput({
          ...firstPlayer.checkResult,
          userId: firstPlayer.id,
        }),
      );

      if (secondPlayer) {
        dispatch(
          actions.updateEditorText({
            userId: secondPlayer.id,
            editorText: secondPlayer.editorText,
            langSlug: secondPlayer.editorLang,
          }),
        );

        dispatch(
          actions.updateExecutionOutput({
            ...secondPlayer.checkResult,
            userId: secondPlayer.id,
          }),
        );
      }

      dispatch(
        actions.updateGameStatus({
          state,
          startsAt,
          timeoutSeconds,
        }),
      );
      gameRoomService.send(channelTopics.gameUserJoinedTopic, {
        payload: data,
      });
    };

    const handleUserWon = (data: any) => {
      const { players, state, msg } = data;
      dispatch(actions.updateGamePlayers({ players }));
      dispatch(actions.updateGameStatus({ state, msg }));
      gameRoomService.send(channelTopics.userWonTopic, { payload: data });
    };

    const handleUserGiveUp = (data: any) => {
      const { players, state, msg } = data;
      dispatch(actions.updateGamePlayers({ players }));
      dispatch(actions.updateGameStatus({ state, msg }));
      channel
        .push(channelMethods.gameHeadToHead, {})
        .receive('ok', (response: any) => dispatch(actions.setGameHeadToHead(response)));
      gameRoomService.send(channelTopics.userGiveUpTopic, { payload: data });
    };

    const handleRematchStatusUpdate = (data: any) => {
      dispatch(actions.updateRematchStatus(data));
      gameRoomService.send(channelTopics.rematchStatusUpdatedTopic, {
        payload: data,
      });
    };

    const handleRematchAccepted = ({ gameId: newGameId }: any) => {
      gameRoomService.send(channelTopics.rematchAcceptedTopic, { newGameId });
      redirectToNewGame(newGameId);
    };

    const handleGameTimeout = (data: any) => {
      const { gameState } = data;
      const payload = { state: gameState };
      dispatch(actions.updateGameStatus(payload));
      gameRoomService.send(channelTopics.gameTimeoutTopic, { payload });
    };

    const handleGameToggleVisible = () => {
      dispatch(actions.toggleVisible());
    };

    const handleGameUnlocked = () => {
      dispatch(actions.setLocked(false));
    };

    const handleTournamentGameCreated = (data: any) => {
      dispatch(actions.setTournamentsInfo(data));
      gameRoomService.send(channelTopics.tournamentGameCreatedTopic, {
        payload: data,
      });
      if (!cancelRedirect) {
        setTimeout(() => {
          window.location.replace(makeGameUrl(data.gameId));
        }, 10);
      }
    };

    const handleTournamentRoundCreated = (response: any) => {
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handleTournamentRoundFinished = (response: any) => {
      dispatch(actions.updateTournamentData(response.tournament));
      dispatch(actions.updateTournamentMatches(response.matches || []));
      gameRoomService.send(channelTopics.tournamentRoundFinishedTopic, {
        payload: response.tournament,
      });
    };

    const handleTournamentGameWait = (response: any) => {
      dispatch(actions.setTournamentWaitType(response.type));
    };

    const handleTournamentFinished = (response: any) => {
      if (response.tournament.groupTournamentId) {
        NiceModal.show(ModalCodes.nextStageGroupTournamentModal, {
          groupTournamentId: response.tournament.groupTournamentId,
        });
      }
    };

    return channel
      .addListener(channelTopics.editorDataTopic, handleNewEditorData)
      .addListener(channelTopics.gameHeadToHead, handleGameHeadToHead)
      .addListener(channelTopics.userStartCheckTopic, handleStartsCheck)
      .addListener(channelTopics.userCheckCompleteTopic, handleNewCheckResult)
      .addListener(channelTopics.userWonTopic, handleUserWon)
      .addListener(channelTopics.userGiveUpTopic, handleUserGiveUp)
      .addListener(channelTopics.rematchStatusUpdatedTopic, handleRematchStatusUpdate)
      .addListener(channelTopics.rematchAcceptedTopic, handleRematchAccepted)
      .addListener(channelTopics.gameUserJoinedTopic, handleUserJoined)
      .addListener(channelTopics.gameTimeoutTopic, handleGameTimeout)
      .addListener(channelTopics.gameToggleVisibleTopic, handleGameToggleVisible)
      .addListener(channelTopics.gameUnlockedTopic, handleGameUnlocked)
      .addListener(channelTopics.tournamentGameCreatedTopic, handleTournamentGameCreated)
      .addListener(channelTopics.tournamentRoundCreatedTopic, handleTournamentRoundCreated)
      .addListener(channelTopics.tournamentRoundFinishedTopic, handleTournamentRoundFinished)
      .addListener(channelTopics.tournamentGameWaitTopic, handleTournamentGameWait)
      .addListener(channelTopics.tournamentFinishedTopic, handleTournamentFinished);
  };

const fetchPlaybook =
  (service: any, init: (dispatch: any) => (data: any) => void) => (dispatch: any) => {
    service.send('START_LOADING_PLAYBOOK');

    requestJson(`/api/v1/playbook/${gameId}`)
      .then((response: any) => {
        const data = camelizeKeys(response);
        const type = isRecord ? PlaybookStatusCodes.stored : PlaybookStatusCodes.active;
        const urlParams = new URLSearchParams(window.location.search);
        const isRealtime = urlParams.get('realtime') !== 'false';
        const resolvedData = isRealtime
          ? resolveRealtimeDiffs(data, type)
          : resolveDiffs(data, type);

        init(dispatch)(resolvedData);

        service.send('LOAD_PLAYBOOK', { payload: resolvedData });
      })
      .catch((err: any) => {
        console.error(err);
        dispatch(actions.setError(err));
        service.send('REJECT_LOADING_PLAYBOOK', { payload: err });
      });
  };

export const changePlaybookSolution = (method: string) => (dispatch: any) => {
  requestJson(`/api/v1/playbooks/${method}`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      'x-csrf-token': window.csrf_token || '',
    },
    body: JSON.stringify({
      game_id: gameId,
    }),
  })
    .then((response: any) => {
      const data = camelizeKeys(response);

      if (data.errors) {
        console.error(data.errors);
        dispatch(
          actions.setError({
            message: data.errors[0],
          }),
        );
      } else {
        dispatch(actions.changeSolutionType(data));
      }
    })
    .catch((error: any) => {
      console.error(error);
      dispatch(actions.setError(error));
    });
};

export const storedEditorReady = (service: any) => {
  service.send('load_stored_editor');

  return () => {};
};

export const downloadPlaybook = (service: any) => (dispatch: any) => {
  dispatch(fetchPlaybook(service, initPlaybook));
};

export const openPlaybook = (service: any) => () => {
  service.send('OPEN_REPLAYER');
};

export const connectToGame = (gameRoomService: any, options: any) => (dispatch: any) => {
  if (isRecord) {
    return fetchPlaybook(gameRoomService, initStoredGame)(dispatch);
  }

  gameRoomService.send('JOIN');

  return activeGameReady(gameRoomService, options)(dispatch);
};

export const connectToEditor = (service: any, isBanned: boolean) => () =>
  isRecord ? storedEditorReady(service) : activeEditorReady(service, isBanned);

export const checkGameSolution = () => (dispatch: any, getState: any) => {
  const state = getState();
  const currentUserId: any = selectors.currentUserIdSelector(state);
  const { text, lang } = selectors.getSolution(currentUserId)(state);

  // FIXME: create actions for this state transitions
  // FIXME: create statuses for solutionStatus
  dispatch(actions.updateGameStatus({ solutionStatus: null }));
  dispatch(actions.updateCheckStatus({ [currentUserId]: true }));

  const payload = {
    editorText: text,
    langSlug: lang,
  };

  channel.push(channelMethods.checkResult, payload);
};

export const compressEditorHeight = (userId: number) => (dispatch: any) =>
  dispatch(actions.compressEditorHeight({ userId }));
export const expandEditorHeight = (userId: number) => (dispatch: any) =>
  dispatch(actions.expandEditorHeight({ userId }));

/*
 * Middleware actions for CodebattlePlayer
 */

export const setGameHistoryState = (recordId: number) => (dispatch: any, getState: any) => {
  const state = getState();
  const initRecords = selectors.playbookInitRecordsSelector(state) as any[];
  const records = selectors.playbookRecordsSelector(state) as string[];

  const { players: editorsState, chat: chatState } = getFinalState({
    recordId,
    records,
    initRecords,
  });

  editorsState.forEach((player: any) => {
    dispatch(
      actions.updateEditorTextHistory({
        userId: player.id,
        editorText: player.editorText,
        langSlug: player.editorLang,
      }),
    );

    dispatch(
      actions.updateExecutionOutputHistory({
        ...player.checkResult,
        userId: player.id,
      }),
    );
  });

  dispatch(actions.updateChatDataHistory(chatState));
};

export const updateGameHistoryState = (nextRecordId: number) => (dispatch: any, getState: any) => {
  const state = getState();
  const records = selectors.playbookRecordsSelector(state) as string[];
  const nextRecord = parse(records[nextRecordId]) || {};

  switch (nextRecord.type) {
    case 'update_editor_data': {
      const editorText = selectors.editorTextHistorySelector(state, nextRecord) as string;
      const editorLang = selectors.editorLangHistorySelector(state, nextRecord);
      const newEditorText = getText(editorText, nextRecord.diff);

      dispatch(
        actions.updateEditorTextHistory({
          userId: nextRecord.userId,
          editorText: newEditorText,
          langSlug: nextRecord.diff.nextLang || editorLang,
        }),
      );
      break;
    }
    case 'check_complete':
      dispatch(
        actions.updateExecutionOutputHistory({
          ...nextRecord.checkResult,
          userId: nextRecord.userId,
        }),
      );
      break;
    case 'chat_message':
    case 'join_chat':
    case 'leave_chat':
      dispatch(actions.updateChatDataHistory(nextRecord.chat));
      break;
    default:
      break;
  }
};

export const changeTaskImgDataUrl = (imgDataUrl: string) => () => {
  channel.push(channelMethods.gameTaskChangeTarget, { imgDataUrl }).receive('ok', () => {
    window.location.reload();
  });
};
