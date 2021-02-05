import React, { useState, useContext, useEffect } from 'react';
import _ from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';
import { useActor } from '@xstate/react';
import * as selectors from '../selectors';
import Editor from './Editor';
import GameContext from './GameContext';
import EditorToolbar from './EditorsToolbars/EditorToolbar';
import GameActionButtons from '../components/GameActionButtons';
import * as GameActions from '../middlewares/Game';
import OutputClicker from './OutputClicker';
import editorModes from '../config/editorModes';
import GameStatusCodes from '../config/gameStatusCodes';
import OutputTab from '../components/ExecutionOutput/OutputTab';
import Output from '../components/ExecutionOutput/Output';

const RightSide = ({ output, children }) => {
  const [showTab, setShowTab] = useState('editor');
  const over = showTab === 'editor' ? '' : 'overflow-auto';
  const isShowOutput = output && output.status;
  return (
    <>
      <div className={`h-100 ${over}`} id="editor">
        {showTab === 'editor' ? <div className="h-100">{children}</div>
        : (
          <div className="h-auto">
            {isShowOutput && <Output sideOutput={output} />}
          </div>
        )}

      </div>
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

const useEditor = id => {
  const [bg, setBg] = useState('bg-white');
  const { send } = useContext(GameContext);

  useEffect(() => {
    send('initEditorActor', {
      context: {},
      config: {
        actions: {
          startTyping: () => setBg('bg-secondary'),
          endTyping: () => setBg('bg-white'),
          startChecking: () => setBg('bg-warning'),
          endChecking: () => setBg('bg-white'),
        },
      },
      name: `editor-${id}`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { bg };
};

const EditorContainer = props => {
  const { actorRef } = props;
  const editorMachine = useActor(actorRef);

  return <Editor editorMachine={editorMachine} {...props} />;
};

const GameWidget = () => {
  const leftEditor = useSelector(selectors.leftEditorSelector);
  const rightEditor = useSelector(selectors.rightEditorSelector);
  const leftUserId = _.get(leftEditor, ['userId'], null);
  const rightUserId = _.get(rightEditor, ['userId'], null);

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const players = useSelector(selectors.gamePlayersSelector);
  const leftEditorHeight = useSelector(selectors.editorHeightSelector(leftUserId));
  const rightEditorHeight = useSelector(selectors.editorHeightSelector(rightUserId));
  const rightOutput = useSelector(selectors.rightExecutionOutputSelector);
  const leftEditorsMode = useSelector(selectors.editorsModeSelector(leftUserId));
  const theme = useSelector(selectors.editorsThemeSelector(leftUserId));
  const isStoredGame = useSelector(state => selectors.gameStatusSelector(state).status === GameStatusCodes.stored);

  const dispatch = useDispatch();
  const updateEditorValue = event => dispatch(GameActions.sendEditorText(event));
  const { current, send } = useContext(GameContext);
  // editor-{id}

  const leftEditorProps = useEditor(leftUserId);
  const rightEditorProps = useEditor(rightUserId);

  if (current.context[`editor-${leftUserId}`] === undefined && current.context[`editor-${rightUserId}`] === undefined) {
    return null;
  }

  const getLeftEditorParams = () => {
    // FIXME: currentUser shouldn't return {} for spectator
    const isPlayer = _.hasIn(players, currentUserId);
    const editable = !isStoredGame && isPlayer;
    const editorState = leftEditor;
    const onChange = editable
      ? value => {
        send('typing', { target: `editor-${leftUserId}` });
        updateEditorValue(value);
      }
      : _.noop;

    return {
      actorRef: current.context[`editor-${leftUserId}`],
      onChange,
      editable,
      syntax: editorState.currentLangSlug || 'javascript',
      value: editorState.text,
      editorHeight: leftEditorHeight,
      mode: editable ? leftEditorsMode : editorModes.default,
      theme,
    };
  };

  const getRightEditorParams = () => {
    const editorState = rightEditor;

    return {
      actorRef: current.context[`editor-${rightUserId}`],
      onChange: _.noop,
      editable: false,
      mode: editorModes.default,
      syntax: editorState.currentLangSlug || 'javascript',
      value: editorState.text,
      editorHeight: rightEditorHeight,
    };
  };

  const getToolbarParams = editor => {
    const isPlayer = editor.userId === currentUserId;

    return {
      isSpectator: isStoredGame || !isPlayer,
      player: players[editor.userId],
      editor,
    };
  };

  return (
    <>
      <div className={`col-12 col-lg-6 p-1 ${leftEditorProps.bg}`}>
        <div className="card h-100 position-relative" style={{ minHeight: '470px' }} data-guide-id="LeftEditor">
          <EditorToolbar
            {...getToolbarParams(leftEditor)}
            toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1"
            editorSettingClassNames="btn-group align-items-center m-1"
            userInfoClassNames="btn-group align-items-center justify-content-end m-1"
          />
          <EditorContainer {...getLeftEditorParams()} />

          {/* TODO: move state to parent component */}
          {!isStoredGame
            && (
            <GameActionButtons
              disabled={false}
              editorUser={leftEditor.userId}
              actorRef={current.context[`editor-${leftUserId}`]}
            />
)}
        </div>
      </div>
      <div className={`col-12 col-lg-6 p-1 ${rightEditorProps.bg}`}>
        <div className="card h-100" style={{ minHeight: '470px' }} data-guide-id="LeftEditor">
          <EditorToolbar
            {...getToolbarParams(rightEditor)}
            toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1 flex-row-reverse"
            editorSettingClassNames="btn-group align-items-center m-1 flex-row-reverse justify-content-end"
            userInfoClassNames="btn-group align-items-center justify-content-end m-1 flex-row-reverse"
          />
          <RightSide output={rightOutput}>
            <EditorContainer {...getRightEditorParams()} />
          </RightSide>
        </div>
      </div>
      <OutputClicker />
    </>
  );
};

export default GameWidget;
