import React, { useEffect, useContext, useCallback, useRef } from "react";

import { useInterpret } from "@xstate/react";
import cn from "classnames";
import Gon from "gon";
import i18next from "i18next";
import noop from "lodash/noop";
import { useDispatch, useSelector } from "react-redux";

import RoomContext from "../../components/RoomContext";
import editorModes from "../../config/editorModes";
import { gameRoomEditorStyles } from "../../config/editorSettings";
import {
  editorBtnStatuses as EditorBtnStatuses,
  editorSettingsByUserType,
} from "../../config/editorSettingsByUserType";
// import editorThemes from '../../config/editorThemes';
import editorUserTypes from "../../config/editorUserTypes";
import GameModeCodes from "../../config/gameModes";
import {
  editorStateSelector,
  inPreviewRoomSelector,
  isRestrictedContentSelector,
  isGameActiveSelector,
  isGameOverSelector,
  openedReplayerSelector,
} from "../../machines/selectors";
import * as GameActions from "../../middlewares/Room";
import * as selectors from "../../selectors";
import { actions } from "../../slices";
import {
  createTelemetryWindow,
  editorSummaryConfig,
  finalizeTelemetryWindow,
  updateTelemetryWindow,
} from "../../utils/editorSummary";
import useMachineStateSelector from "../../utils/useMachineStateSelector";

import EditorToolbar from "./EditorToolbar";

const restrictedText = '\n\n\n\t"Only for Premium subscribers"';
const editorSummaryEnabled = !!Gon.getAsset("editor_summary_enabled");

const useEditorChannelSubscription = (mainService, editorService, player) => {
  const dispatch = useDispatch();

  const isPreview = useMachineStateSelector(mainService, inPreviewRoomSelector);

  useEffect(() => {
    if (isPreview) {
      return () => {};
    }

    const clearEditorListeners = GameActions.connectToEditor(
      editorService,
      player?.isBanned,
    )(dispatch);

    return clearEditorListeners;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);
};

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
}) {
  const dispatch = useDispatch();

  const toolbarRef = useRef();
  const editorTelemetryWindowRef = useRef(null);
  const editorTelemetryTimerRef = useRef(null);

  const player = useSelector(selectors.gamePlayerSelector(id));
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isPremium = useSelector(selectors.currentUserIsPremiumSelector);
  const gameId = useSelector(selectors.gameIdSelector);
  const gameMode = useSelector(selectors.gameModeSelector);
  const { tournamentId, startsAt, hideBannedPlayerControls } = useSelector(
    selectors.gameStatusSelector,
  );
  const subscriptionType = useSelector(selectors.subscriptionTypeSelector);

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const currentEditorLangSlug = useSelector(selectors.userLangSelector(currentUserId));

  const updateEditorValue = useCallback(
    (data) => dispatch(GameActions.updateEditorText(data)),
    [dispatch],
  );
  const updateAndSendEditorValue = useCallback(
    (data) => {
      dispatch(GameActions.updateEditorText(data));
      dispatch(GameActions.sendEditorText(data));
    },
    [dispatch],
  );

  const { mainService } = useContext(RoomContext);
  const isPreview = useMachineStateSelector(mainService, inPreviewRoomSelector);
  const isRestricted = useMachineStateSelector(mainService, isRestrictedContentSelector);
  const isActiveGame = useMachineStateSelector(mainService, isGameActiveSelector);
  const isGameOver = useMachineStateSelector(mainService, isGameOverSelector);
  const openedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);

  const isTournamentGame = !!tournamentId;

  const context = { userId: id, type, subscriptionType };

  const editorService = useInterpret(editorMachine, {
    context,
    devTools: true,
    id: `editor_${id}`,
    actions: {
      userSendSolution: (ctx) => {
        if (ctx.editorState === "active") {
          dispatch(GameActions.checkGameSolution());
        }
      },
      handleTimeoutFailureChecking: (ctx) => {
        dispatch(
          actions.updateExecutionOutput({
            userId: ctx.userId,
            status: "client_timeout",
            output: "",
            result: {},
            asserts: [],
          }),
        );

        dispatch(actions.updateCheckStatus({ [ctx.userId]: false }));
      },
    },
  });

  const editorCurrent = useMachineStateSelector(editorService, editorStateSelector);

  const checkActiveTaskSolution = useCallback(
    () => editorService.send("user_check_solution"),
    [editorService],
  );
  const checkResult = checkActiveTaskSolution;

  const isNeedHotKeys = editorCurrent.context.type === editorUserTypes.currentUser;

  useEditorChannelSubscription(mainService, editorService, player);

  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const check = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        checkResult();
      }
    };

    if (isNeedHotKeys) {
      window.addEventListener("keydown", check);

      return () => {
        window.removeEventListener("keydown", check);
      };
    }

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userSettings = {
    type,
    ...editorSettingsByUserType[type],
    ...editorCurrent.context,
  };

  const actionBtnsProps = {
    checkResult,
    currentEditorLangSlug,
    ...userSettings,
    showGiveUpBtn: !isTournamentGame,
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
    isAdmin,
    isPremium,
    actionBtnsProps,
    hideToolbarControls: hideBannedPlayerControls,
    ...userSettings,
  };

  const canChange = userSettings.type === editorUserTypes.currentUser && !openedReplayer;
  const editable =
    !openedReplayer && userSettings.editable && userSettings.editorState !== "banned";
  const canSendCursor = canChange;
  const canCaptureEditorTelemetry =
    editorSummaryEnabled && canChange && editable && isActiveGame && !isPreview;
  const updateEditor =
    editorCurrent.context.editorState === "testing" ? updateEditorValue : updateAndSendEditorValue;
  const onChange = canChange ? updateEditor : noop;
  const showBannedMessage = type === editorUserTypes.currentUser && player?.isBanned;

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
    (event) => {
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
    wordWrap: "off",
    lineNumbers: "on",
    fontSize: 16,
    hidingPanelControls: false,
    userType: type,
    syntax: editorState?.currentLangSlug || "js",
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
    loading: isPreview || editorCurrent.value === "loading",
  };

  const isWon = player?.result === "won";

  const pannelBackground = cn(editorContainerClassName, {
    "bg-warning": editorCurrent.matches("checking"),
    "bg-winner": isGameOver && editorCurrent.matches("idle") && isWon,
  });

  const gameRoomEditorStylesVersion2 = {
    minHeight: `calc(100vh - 92px - ${toolbarRef.current?.clientHeight || 0}px)`,
  };

  return (
    <div data-editor-state={editorCurrent.value} className={pannelBackground}>
      <div
        // className={`${editorParams.theme === editorThemes.dark ? 'bg-dark ' : 'bg-white '}${cardClassName}`}
        className={cardClassName}
        style={orientation === "side" ? gameRoomEditorStylesVersion2 : gameRoomEditorStyles}
        data-guide-id={orientation === "left" ? "LeftEditor" : ""}
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
              "Your tournament access is temporarily restricted due to a fair-play review. You cannot be paired into new games right now. If you believe this is a mistake, please contact tournament support.",
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
