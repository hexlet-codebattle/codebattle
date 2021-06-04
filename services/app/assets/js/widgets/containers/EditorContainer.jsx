import React, { useEffect, useContext } from 'react';
import _ from 'lodash';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useMachine } from '@xstate/react';
import editorMachine from '../machines/editor';
import editorModes from '../config/editorModes';
import EditorToolbar from './EditorsToolbars/EditorToolbar';
import * as GameActions from '../middlewares/Game';
import * as selectors from '../selectors';
import GameContext from './GameContext';
import { replayerMachineStates } from '../machines/game';
import editorSettingsByUserType from '../config/editorSettingsByUserType';
import editorUserTypes from '../config/editorUserTypes';

const EditorContainer = ({
  id,
  type,
  cardClassName,
  theme,
  editorState,
  editorHeight,
  editorMode,
  children,
}) => {
  const dispatch = useDispatch();
  const updateEditorValue = data => dispatch(GameActions.sendEditorText(data));
  const players = useSelector(selectors.gamePlayersSelector);
  const { current: gameCurrent } = useContext(GameContext);

  const context = { userId: id };

  const config = {
    actions: {
      userStartChecking: () => {
        dispatch(GameActions.checkGameResult());
      },
    },
  };

  const [editorCurrent, send, service] = useMachine(
    editorMachine.withConfig(config),
    {
      context,
      devTools: true,
      id: `editor_${id}`,
    },
  );

  const checkResult = () => {
    send('user_check_solution');
  };

  useEffect(() => {
    GameActions.connectToEditor(service)(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNeedHotKeys = editorCurrent.context.type === 'current_user';

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

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userSettings = {
    type,
    ...editorCurrent.context,
    ...editorSettingsByUserType[type],
  };

  const actionBtnsProps = {
    checkResult,
    ...userSettings,
  };

  const toolbarParams = {
    player: players[id],
    editor: editorState,
    status: editorCurrent.value,
    actionBtnsProps,
    ...userSettings,
  };

  const canChange = userSettings.type === editorUserTypes.currentUser
    && !gameCurrent.matches({ replayer: replayerMachineStates.on });
  const onChange = canChange
    ? value => {
        updateEditorValue(value);
      }
    : _.noop();
  const editorParams = {
    syntax: editorState.currentLangSlug || 'javascript',
    onChange,
    checkResult,
    value: editorState.text,
    editorHeight,
    mode: editorCurrent.context.editable ? editorMode : editorModes.default,
    theme,
    ...userSettings,
    editable:
      !gameCurrent.matches({ replayer: replayerMachineStates.on })
      && userSettings.editable,
  };

  const isWon = players[id].gameResult === 'won';

  const pannelBackground = cn('col-12 col-lg-6 p-1', {
    'bg-warning': editorCurrent.matches('checking'),
    'bg-winner':
      gameCurrent.matches({ game: 'game_over' })
      && editorCurrent.matches('idle')
      && isWon,
  });

  return (
    <div data-editor-state={editorCurrent.value} className={pannelBackground}>
      <div
        className={cardClassName}
        style={{ minHeight: '470px' }}
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
