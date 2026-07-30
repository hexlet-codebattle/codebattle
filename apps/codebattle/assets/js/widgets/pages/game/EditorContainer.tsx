import React, { useEffect, useContext, useCallback, useRef, type ReactNode } from 'react';

import { useActorRef } from '@xstate/react';
import cn from 'classnames';
import i18next from 'i18next';
import noop from 'lodash/noop';
import { useDispatch, useSelector } from 'react-redux';

import { getPageProp } from '@/inertia/pageProps';

import RoomContext from '../../components/RoomContext';
import editorModes from '../../config/editorModes';
import { gameRoomEditorStyles } from '../../config/editorSettings';
import {
  editorBtnStatuses as EditorBtnStatuses,
  editorSettingsByUserType,
} from '../../config/editorSettingsByUserType';
// import editorThemes from '../../config/editorThemes';
import editorUserTypes from '../../config/editorUserTypes';
import GameModeCodes from '../../config/gameModes';
import {
  editorStateSelector,
  inPreviewRoomSelector,
  isRestrictedContentSelector,
  isGameActiveSelector,
  isGameOverSelector,
  openedReplayerSelector,
} from '../../machines/selectors';
import * as GameActions from '../../middlewares/Room';
import * as selectors from '../../selectors';
import { actions, type AppDispatch } from '../../slices';
import { type Player } from '../../slices/initial';
import {
  createTelemetryWindow,
  editorSummaryConfig,
  finalizeTelemetryWindow,
  updateTelemetryWindow,
  type TelemetryEvent,
  type TelemetryWindow,
} from '../../utils/editorSummary';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import EditorToolbar from './EditorToolbar';

const restrictedText = '\n\n\n\t"Only for Premium subscribers"';

// Default ON unless the server-provided Inertia flag explicitly disables it. Read at call time
// so SPA navigation between pages can't latch a stale `false`.
const isEditorSummaryEnabled = () => getPageProp<boolean>('editor_summary_enabled', true);

// xstate v4 interpreter/machine have no usable exported types here (rule 7)
interface RoomContextValue {
  mainService: any;
}

const useEditorChannelSubscription = (
  mainService: any,
  editorService: any,
  player: Player | null | undefined,
) => {
  const dispatch = useDispatch<AppDispatch>();

  const isPreview = useMachineStateSelector(mainService, inPreviewRoomSelector);

  useEffect(() => {
    if (isPreview) {
      return () => {};
    }

    const connectToEditor = GameActions.connectToEditor as (
      service: any,
      isBanned: boolean,
    ) => (dispatch: AppDispatch) => () => void;
    const clearEditorListeners = connectToEditor(
      editorService,
      player?.isBanned as boolean,
    )(dispatch);

    return clearEditorListeners;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);
};

interface EditorState {
  text?: unknown;
  currentLangSlug?: string;
  result?: string;
  [key: string]: unknown;
}

interface EditorContainerProps {
  id?: number;
  // xstate v4 machine — no usable exported type (rule 7)
  editorMachine: any;
  type?: string;
  orientation?: string;
  cardClassName?: string;
  editorContainerClassName?: string;
  theme?: string;
  editorState?: EditorState | null;
  editorHeight?: unknown;
  editorMode?: string;
  children: (params: Record<string, unknown>) => ReactNode;
}

function EditorContainer({
  id,
  editorMachine,
  type,
  orientation,
  cardClassName,
  editorContainerClassName,
  theme,
  editorState,
  editorHeight,
  editorMode,
  children,
}: EditorContainerProps) {
  const dispatch = useDispatch<AppDispatch>();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorTelemetryWindowRef = useRef<TelemetryWindow | null>(null);
  const editorTelemetryTimerRef = useRef<number | null>(null);

  const player = useSelector(selectors.gamePlayerSelector(id as number));
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isAdminOrModerator = useSelector(selectors.currentUserIsAdminOrModeratorSelector);
  const isPremium = useSelector(selectors.currentUserIsPremiumSelector);
  const currentUserIsBot = useSelector(selectors.currentUserIsBotSelector);
  const gameId = useSelector(selectors.gameIdSelector);
  const gameMode = useSelector(selectors.gameModeSelector);
  const { tournamentId, startsAt, hideBannedPlayerControls } = useSelector(
    selectors.gameStatusSelector,
  );
  const subscriptionType = useSelector(selectors.subscriptionTypeSelector);

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const currentEditorLangSlug = useSelector(selectors.userLangSelector(currentUserId as number));

  const updateEditorValue = useCallback(
    (data: string) => dispatch(GameActions.updateEditorText(data)),
    [dispatch],
  );
  const updateAndSendEditorValue = useCallback(
    (data: string) => {
      dispatch(GameActions.updateEditorText(data));
      dispatch(GameActions.sendEditorText(data));
    },
    [dispatch],
  );

  const { mainService } = useContext(RoomContext) as RoomContextValue;
  const isPreview = useMachineStateSelector(mainService, inPreviewRoomSelector);
  const isRestricted = useMachineStateSelector(mainService, isRestrictedContentSelector);
  const isActiveGame = useMachineStateSelector(mainService, isGameActiveSelector);
  const isGameOver = useMachineStateSelector(mainService, isGameOverSelector);
  const openedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);

  const isTournamentGame = !!tournamentId;

  const context = { userId: id, type, subscriptionType };

  // xstate v5: per-instance implementations via `.provide(...)`; seed context via `input`.
  const editorService = useActorRef(
    editorMachine.provide({
      actions: {
        userSendSolution: ({ context: ctx }: any) => {
          if (ctx.editorState === 'active') {
            dispatch(GameActions.checkGameSolution());
          }
        },
        handleTimeoutFailureChecking: ({ context: ctx }: any) => {
          dispatch(
            actions.updateExecutionOutput({
              userId: ctx.userId,
              status: 'client_timeout',
              output: '',
              result: {},
              asserts: [],
            }),
          );

          dispatch(actions.updateCheckStatus({ [ctx.userId]: false }));
        },
      },
    }),
    { id: `editor_${id}`, input: context },
  );

  const editorCurrent = useMachineStateSelector(editorService, editorStateSelector);

  const checkActiveTaskSolution = useCallback(
    () => editorService.send({ type: 'user_check_solution' }),
    [editorService],
  );
  const checkResult = isActiveGame ? checkActiveTaskSolution : noop;

  const isNeedHotKeys = editorCurrent.context.type === editorUserTypes.currentUser;

  useEditorChannelSubscription(mainService, editorService, player);

  useEffect(() => {
    const check = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        checkResult();
      }
    };

    if (isNeedHotKeys) {
      window.addEventListener('keydown', check);

      return () => {
        window.removeEventListener('keydown', check);
      };
    }

    return () => {};
  }, [checkResult, isNeedHotKeys]);

  const userSettings = {
    type,
    ...editorSettingsByUserType[type as string],
    ...editorCurrent.context,
  };

  const actionBtnsProps = {
    checkResult,
    currentEditorLangSlug,
    ...userSettings,
    showGiveUpBtn: !isTournamentGame,
    checkBtnStatus: isActiveGame ? userSettings.checkBtnStatus : EditorBtnStatuses.disabled,
    resetBtnStatus: isActiveGame ? userSettings.resetBtnStatus : EditorBtnStatuses.disabled,
    giveUpBtnStatus: isActiveGame ? userSettings.giveUpBtnStatus : EditorBtnStatuses.disabled,
  };

  const toolbarParams = {
    toolbarRef,
    gameId,
    tournamentId,
    mode: tournamentId ? GameModeCodes.tournament : gameMode,
    player,
    editor: editorState,
    status: editorCurrent.value,
    isAdmin: isAdminOrModerator,
    isPremium,
    actionBtnsProps,
    hideToolbarControls: hideBannedPlayerControls,
    ...userSettings,
  };

  const canChange = userSettings.type === editorUserTypes.currentUser && !openedReplayer;
  const editable =
    !openedReplayer && userSettings.editable && userSettings.editorState !== 'banned';
  const canSendCursor = canChange;
  const canCaptureEditorTelemetry =
    isEditorSummaryEnabled() &&
    canChange &&
    editable &&
    isActiveGame &&
    !isPreview &&
    !currentUserIsBot;
  const updateEditor =
    editorCurrent.context.editorState === 'testing' ? updateEditorValue : updateAndSendEditorValue;
  const onChange = canChange ? updateEditor : noop;
  const showBannedMessage = (type === editorUserTypes.currentUser && player?.isBanned) as boolean;

  const flushEditorTelemetry = useCallback(() => {
    if (!canCaptureEditorTelemetry) {
      editorTelemetryWindowRef.current = null;
      return;
    }

    const summary = finalizeTelemetryWindow(editorTelemetryWindowRef.current);
    editorTelemetryWindowRef.current = null;

    if (summary) {
      dispatch(
        GameActions.sendEditorSummary(summary, summary.langSlug || editorState?.currentLangSlug),
      );
    }
  }, [canCaptureEditorTelemetry, dispatch, editorState?.currentLangSlug]);

  useEffect(() => {
    return () => {
      if (editorTelemetryTimerRef.current) {
        window.clearTimeout(editorTelemetryTimerRef.current);
        editorTelemetryTimerRef.current = null;
      }

      flushEditorTelemetry();
    };
  }, [flushEditorTelemetry]);

  useEffect(() => {
    if (!canCaptureEditorTelemetry) {
      if (editorTelemetryTimerRef.current) {
        window.clearTimeout(editorTelemetryTimerRef.current);
        editorTelemetryTimerRef.current = null;
      }

      editorTelemetryWindowRef.current = null;
    }
  }, [canCaptureEditorTelemetry]);

  const onTelemetryEvent = useCallback(
    (event: TelemetryEvent) => {
      if (!canCaptureEditorTelemetry) {
        return;
      }

      const currentWindow = editorTelemetryWindowRef.current;
      const shouldRotateWindow =
        currentWindow &&
        event.lang_slug &&
        currentWindow.langSlug &&
        currentWindow.langSlug !== event.lang_slug;

      if (shouldRotateWindow) {
        if (editorTelemetryTimerRef.current) {
          window.clearTimeout(editorTelemetryTimerRef.current);
          editorTelemetryTimerRef.current = null;
        }

        flushEditorTelemetry();
      }

      editorTelemetryWindowRef.current = updateTelemetryWindow(
        editorTelemetryWindowRef.current,
        event,
      );

      if (!editorTelemetryTimerRef.current) {
        editorTelemetryTimerRef.current = window.setTimeout(() => {
          editorTelemetryTimerRef.current = null;
          flushEditorTelemetry();
        }, editorSummaryConfig.windowMs);
      }

      if (editorTelemetryWindowRef.current.eventCount >= editorSummaryConfig.eventLimit) {
        window.clearTimeout(editorTelemetryTimerRef.current);
        editorTelemetryTimerRef.current = null;
        flushEditorTelemetry();
      }
    },
    [canCaptureEditorTelemetry, flushEditorTelemetry],
  );

  const editorParams = {
    roomMode: tournamentId ? GameModeCodes.tournament : gameMode,
    userId: id,
    wordWrap: 'off',
    lineNumbers: 'on',
    fontSize: 16,
    hidingPanelControls: false,
    userType: type,
    syntax: editorState?.currentLangSlug || 'js',
    onChange,
    onTelemetryEvent,
    gameStartTimeMs: startsAt ? new Date(startsAt).getTime() : null,
    canSendCursor,
    checkResult,
    value: isRestricted ? restrictedText : editorState?.text,
    editorHeight,
    mode: editorMode || editorModes.default,
    isTournamentGame,
    theme,
    ...userSettings,
    editable,
    allowClipboard: isAdmin,
    loading: isPreview || editorCurrent.value === 'loading',
  };

  const isWon = player?.result === 'won';

  const pannelBackground = cn(editorContainerClassName, {
    'bg-warning': editorCurrent.matches('checking'),
    'bg-winner': isGameOver && editorCurrent.matches('idle') && isWon,
  });

  const gameRoomEditorStylesVersion2 = {
    minHeight: `calc(100vh - 92px - ${toolbarRef.current?.clientHeight || 0}px)`,
  };

  return (
    <div data-editor-state={editorCurrent.value} className={pannelBackground}>
      <div
        // className={`${editorParams.theme === editorThemes.dark ? 'bg-dark ' : 'bg-white '}${cardClassName}`}
        className={cardClassName}
        style={orientation === 'side' ? gameRoomEditorStylesVersion2 : gameRoomEditorStyles}
        data-guide-id={orientation === 'left' ? 'LeftEditor' : ''}
      >
        <EditorToolbar
          {...toolbarParams}
          toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1"
          editorSettingClassNames="btn-group align-items-center m-1"
          userInfoClassNames="btn-group align-items-center justify-content-end m-1"
        />
        {showBannedMessage && (
          <div className="alert alert-warning mx-2 mb-2" role="alert">
            {i18next.t(
              'Your tournament access is temporarily restricted due to a fair-play review. You cannot be paired into new games right now. If you believe this is a mistake, please contact tournament support.',
            )}
          </div>
        )}
        {children({
          ...editorParams,
        })}
      </div>
    </div>
  );
}

export default EditorContainer;
