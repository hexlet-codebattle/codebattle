import React, { useEffect, useContext, useCallback } from 'react';

import { useInterpret } from '@xstate/react';
import cn from 'classnames';
import noop from 'lodash/noop';
import { useDispatch, useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import editorModes from '../../config/editorModes';
import { gameRoomEditorStyles } from '../../config/editorSettings';
import {
  editorBtnStatuses as EditorBtnStatuses,
  editorSettingsByUserType,
} from '../../config/editorSettingsByUserType';
import editorUserTypes from '../../config/editorUserTypes';
import {
  editorStateSelector,
  inBuilderRoomSelector,
  inPreviewRoomSelector,
  inTestingRoomSelector,
  isGameActiveSelector,
  isGameOverSelector,
  openedReplayerSelector,
} from '../../machines/selectors';
import * as GameActions from '../../middlewares/Game';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import EditorToolbar from './EditorToolbar';

function EditorContainer({
  cardClassName,
  children,
  editorHeight,
  editorMachine,
  editorMode,
  editorState,
  id,
  theme,
  type,
}) {
  const dispatch = useDispatch();
  const players = useSelector(selectors.gamePlayersSelector);
  const gameMode = useSelector(selectors.gameModeSelector);

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const currentEditorLangSlug = useSelector((state) =>
    selectors.userLangSelector(state)(currentUserId),
  );

  const updateEditorValue = useCallback(
    (data) => dispatch(GameActions.updateEditorText(data)),
    [dispatch],
  );
  const sendEditorValue = useCallback(
    (data) => dispatch(GameActions.sendEditorText(data)),
    [dispatch],
  );

  const { mainService } = useContext(RoomContext);
  const isPreview = useMachineStateSelector(mainService, inPreviewRoomSelector);
  const inTestingRoom = useMachineStateSelector(mainService, inTestingRoomSelector);
  const inBuilderRoom = useMachineStateSelector(mainService, inBuilderRoomSelector);
  const isActiveGame = useMachineStateSelector(mainService, isGameActiveSelector);
  const isGameOver = useMachineStateSelector(mainService, isGameOverSelector);
  const openedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);

  const context = { userId: id, type };

  const editorService = useInterpret(editorMachine, {
    context,
    devTools: true,
    id: `editor_${id}`,
    actions: {
      userSendSolution: (ctx) => {
        if (ctx.editorState === 'active') {
          dispatch(GameActions.checkGameSolution());
        }
      },
      handleTimeoutFailureChecking: (ctx) => {
        dispatch(
          actions.updateExecutionOutput({
            userId: ctx.userId,
            status: 'timeout',
            output: '',
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
    () => editorService.send('user_check_solution'),
    [editorService],
  );
  const checkTestTaskSolution = useCallback(
    () => dispatch(GameActions.checkTaskSolution(editorService)),
    [dispatch, editorService],
  );

  const checkResult = inTestingRoom ? checkTestTaskSolution : checkActiveTaskSolution;

  useEffect(() => {
    if (inTestingRoom) {
      editorService.send('load_testing_editor');

      return () => {};
    }

    const clearEditor = GameActions.connectToEditor(editorService)(dispatch);

    return clearEditor;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNeedHotKeys = editorCurrent.context.type === editorUserTypes.currentUser;

  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const check = (e) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTestingRoom]);

  const userSettings = {
    type,
    ...editorSettingsByUserType[type],
    ...editorCurrent.context,
  };

  const actionBtnsProps = {
    checkResult,
    currentEditorLangSlug,
    ...userSettings,
    giveUpBtnStatus: isActiveGame ? userSettings.giveUpBtnStatus : EditorBtnStatuses.disabled,
  };

  const toolbarParams = {
    mode: gameMode,
    player: players[id],
    editor: editorState,
    status: editorCurrent.value,
    actionBtnsProps,
    ...userSettings,
  };

  const canChange = userSettings.type === editorUserTypes.currentUser && !openedReplayer;
  const canSendCursor = canChange && !inTestingRoom && !inBuilderRoom;
  const updateEditor =
    editorCurrent.context.editorState === 'testing' ? updateEditorValue : sendEditorValue;
  const onChange = canChange ? updateEditor : noop();
  const onChangeCursorSelection = canSendCursor ? GameActions.sendEditorCursorSelection : undefined;
  const onChangeCursorPosition = canSendCursor ? GameActions.sendEditorCursorPosition : undefined;

  const editorParams = {
    userId: id,
    userType: type,
    syntax: editorState.currentLangSlug || 'js',
    onChange,
    onChangeCursorSelection,
    onChangeCursorPosition,
    checkResult,
    value: editorState.text,
    editorHeight,
    mode: editorMode || editorModes.default,
    theme,
    ...userSettings,
    editable: !openedReplayer && userSettings.editable,
    loading: isPreview || editorCurrent.value === 'loading',
  };

  const isWon = players[id].result === 'won';

  const pannelBackground = cn('col-12 col-lg-6 p-1', {
    'bg-warning': editorCurrent.matches('checking'),
    'bg-winner': isGameOver && editorCurrent.matches('idle') && isWon,
  });

  return (
    <div className={pannelBackground} data-editor-state={editorCurrent.value}>
      <div className={cardClassName} data-guide-id="LeftEditor" style={gameRoomEditorStyles}>
        <EditorToolbar
          {...toolbarParams}
          editorSettingClassNames="btn-group align-items-center m-1"
          toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1"
          userInfoClassNames="btn-group align-items-center justify-content-end m-1"
        />
        {children({
          ...editorParams,
        })}
      </div>
    </div>
  );
}

export default EditorContainer;
