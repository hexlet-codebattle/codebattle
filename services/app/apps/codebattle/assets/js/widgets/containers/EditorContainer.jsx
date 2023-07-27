import React, { useEffect, useContext, useCallback } from 'react';
import _ from 'lodash';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useMachine } from '@xstate/react';
import editorModes from '../config/editorModes';
import EditorToolbar from './EditorsToolbars/EditorToolbar';
import * as GameActions from '../middlewares/Game';
import { actions } from '../slices';
import * as selectors from '../selectors';
import RoomContext from './RoomContext';
import editorSettingsByUserType from '../config/editorSettingsByUserType';
import editorUserTypes from '../config/editorUserTypes';
import { gameRoomEditorStyles } from '../config/editorSettings';
import { inTestingRoomSelector, isGameOverSelector, openedReplayerSelector } from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';

const EditorContainer = ({
  id,
  editorMachine,
  type,
  cardClassName,
  theme,
  editorState,
  editorHeight,
  editorMode,
  children,
}) => {
  const dispatch = useDispatch();
  const players = useSelector(selectors.gamePlayersSelector);

  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const currentEditorLangSlug = useSelector(state => selectors.userLangSelector(state)(currentUserId));
  const score = useSelector(state => selectors.userGameScoreByPlayerId(state)(id));

  const updateEditorValue = useCallback(data => dispatch(GameActions.updateEditorText(data)), [dispatch]);
  const sendEditorValue = useCallback(data => dispatch(GameActions.sendEditorText(data)), [dispatch]);

  const { mainService } = useContext(RoomContext);
  const inTestingRoom = useMachineStateSelector(mainService, inTestingRoomSelector);
  const isGameOver = useMachineStateSelector(mainService, isGameOverSelector);
  const openedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);

  const context = { userId: id, type };

  const config = {
    actions: {
      userSendSolution: ctx => {
        if (ctx.editorState === 'active') {
          dispatch(GameActions.checkGameSolution());
        }
      },
      handleTimeoutFailureChecking: ctx => {
        dispatch(actions.updateExecutionOutput({
          userId: ctx.userId,
          status: 'timeout',
          output: '',
          result: {},
          asserts: [],
        }));

        dispatch(actions.updateCheckStatus({ [ctx.userId]: false }));
      },
    },
  };

  const [editorCurrent, , service] = useMachine(
    editorMachine.withConfig(config),
    {
      context,
      devTools: true,
      id: `editor_${id}`,
    },
  );

  const checkResult = useCallback(() => {
    if (inTestingRoom) {
      dispatch(GameActions.checkTaskSolution(service));
    } else {
      service.send('user_check_solution');
    }
  }, [service, inTestingRoom, dispatch]);

  useEffect(() => {
    if (inTestingRoom) {
      service.send('load_testing_editor');
    } else {
      dispatch(GameActions.connectToEditor(service));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNeedHotKeys = editorCurrent.context.type === editorUserTypes.currentUser;

  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const check = e => {
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

    return () => { };
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
  };

  const toolbarParams = {
    score,
    player: players[id],
    editor: editorState,
    status: editorCurrent.value,
    actionBtnsProps,
    ...userSettings,
  };

  const canChange = userSettings.type === editorUserTypes.currentUser && !openedReplayer;
  const updateEditor = editorCurrent.context.editorState === 'testing' ? updateEditorValue : sendEditorValue;
  const onChange = canChange ? updateEditor : _.noop();

  const editorParams = {
    syntax: editorState.currentLangSlug || 'js',
    onChange,
    checkResult,
    value: editorState.text,
    editorHeight,
    mode: editorMode || editorModes.default,
    theme,
    ...userSettings,
    editable: !openedReplayer && userSettings.editable,
  };

  const isWon = players[id].result === 'won';

  const pannelBackground = cn('col-12 col-lg-6 p-1', {
    'bg-warning': editorCurrent.matches('checking'),
    'bg-winner': isGameOver && editorCurrent.matches('idle') && isWon,
  });

  return (
    <div data-editor-state={editorCurrent.value} className={pannelBackground}>
      <div
        className={cardClassName}
        style={gameRoomEditorStyles}
        data-guide-id="LeftEditor"
      >
        <EditorToolbar
          {...toolbarParams}
          toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1"
          editorSettingClassNames="btn-group align-items-center m-1"
          userInfoClassNames="btn-group align-items-center justify-content-end m-1"
        />
        {children({
          ...editorParams,
        })}
      </div>
    </div>
  );
};

export default EditorContainer;
