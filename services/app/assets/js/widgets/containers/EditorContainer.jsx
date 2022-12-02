import React, { useState, useEffect, useContext, useRef } from 'react';
import _ from 'lodash';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useMachine } from '@xstate/react';
import editorModes from '../config/editorModes';
import EditorToolbar from './EditorsToolbars/EditorToolbar';
import Editor from './Editor';
import * as GameActions from '../middlewares/Game';
import { actions } from '../slices';
import * as selectors from '../selectors';
import GameContext from './GameContext';
import { replayerMachineStates } from '../machines/game';
import editorSettingsByUserType from '../config/editorSettingsByUserType';
import editorUserTypes from '../config/editorUserTypes';
import OutputTab from '../components/ExecutionOutput/OutputTab';
import Output from '../components/ExecutionOutput/Output';

const EditorContainer = ({
  id,
  editorMachine,
  renderOutput,
  type,
  cardClassName,
  theme,
  editorState,
  editorHeight,
  editorMode,
}) => {
  const dispatch = useDispatch();
  const editorRef = useRef(null);
  const updateEditorValue = data => dispatch(GameActions.sendEditorText(data));
  const players = useSelector(selectors.gamePlayersSelector);

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const gameType = useSelector(selectors.gameTaskSelector);
  const currentEditorLangSlug = useSelector(state => selectors.userLangSelector(state)(currentUserId));

  const { current: gameCurrent } = useContext(GameContext);
  const rightOutput = useSelector(selectors.rightExecutionOutputSelector(gameCurrent));

  const context = { userId: id, type };

  const config = {
    actions: {
      userStartChecking: () => {
        dispatch(GameActions.checkGameResult());
      },
      handleTimeoutFailureChecking: () => {
        dispatch(actions.updateExecutionOutput({
          userId: id,
          status: 'timeout',
          output: '',
          result: {},
          asserts: [],
        }));

        dispatch(actions.updateCheckStatus({ [id]: false }));
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

    return () => { };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userSettings = {
    type,
    ...editorCurrent.context,
    ...editorSettingsByUserType[type],
  };

  const onReset = (value) => {
    editorRef.current.setInitialValue(value)
  };

  const actionBtnsProps = {
    checkResult,
    onReset: onReset,
    ...userSettings,
    currentEditorLangSlug,
  };

  const toolbarProps = {
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
  const editorProps = {
    syntax: editorState.currentLangSlug || 'js',
    gameType: gameType,
    onChange,
    ref: editorRef,
    checkResult,
    value: editorState.text,
    codeVersion: editorState.codeVersion,
    editorHeight,
    mode: editorCurrent.context.editable ? editorMode : editorModes.default,
    theme,
    ...userSettings,
    editable:
      !gameCurrent.matches({ replayer: replayerMachineStates.on })
      && userSettings.editable,
  };

  const isWon = players[id].result === 'won';

  const pannelBackground = cn('col-12 col-lg-6 p-1', {
    'bg-warning': editorCurrent.matches('checking'),
    'bg-winner':
      gameCurrent.matches({ game: 'game_over' })
      && editorCurrent.matches('idle')
      && isWon,
  });

  const RightSide = ({ output, children }) => {
    const [showTab, setShowTab] = useState('editor');
    const isShowOutput = output && output.status;
    const content = showTab === 'editor' ? (
      <div id="editor" className="d-flex flex-column flex-grow-1">
        {children}
      </div>
    ) : (
      <div className="d-flex flex-column flex-grow-1 overflow-auto">
        <div className="h-auto">
          {isShowOutput && <Output sideOutput={output} />}
        </div>
      </div>
    );

    return (
      <>
        {content}
        <nav>
          <div className="nav nav-tabs bg-gray text-uppercase text-center font-weight-bold" id="nav-tab" role="tablist">
            <a
              className={cn(
                'nav-item nav-link flex-grow-1 text-black rounded-0 px-5',
                { active: showTab === 'editor' },
              )}
              href="#Editor"
              onClick={e => {
                e.preventDefault();
                setShowTab('editor');
              }}
            >
              Editor
            </a>
            <a
              className={cn(
                'nav-item nav-link flex-grow-1 text-black rounded-0 p-2 block',
                { active: showTab === 'output' },
              )}
              href="#Output"
              onClick={e => {
                e.preventDefault();
                setShowTab('output');
              }}
            >
              {isShowOutput && <OutputTab sideOutput={output} side="right" />}
            </a>
          </div>
        </nav>
      </>
    );
  };


  return (
    <div data-editor-state={editorCurrent.value} className={pannelBackground}>
      <div
        className={cardClassName}
        style={{ minHeight: '470px' }}
        data-guide-id="LeftEditor"
      >
        <EditorToolbar
          {...toolbarProps}
          toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1"
          editorSettingClassNames="btn-group align-items-center m-1"
          userInfoClassNames="btn-group align-items-center justify-content-end m-1"
        />
        {
          renderOutput ?
            (<RightSide output={rightOutput}>
              <Editor {...editorProps} />
            </RightSide>)
            :
            (<Editor {...editorProps} />)
        }
      </div>
    </div>
  );
};

export default EditorContainer;
