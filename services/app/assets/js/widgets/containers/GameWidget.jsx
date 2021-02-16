import React, { useState, useEffect, useContext } from 'react';
import _ from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';
import { useMachine } from '@xstate/react';
import GameContext from './GameContext';
import editorMachine, { initContext } from '../machines/editor';
import * as selectors from '../selectors';
import Editor from './Editor';
import EditorToolbar from './EditorsToolbars/EditorToolbar';
import GameActionButtons from '../components/GameActionButtons';
import * as GameActions from '../middlewares/Game';
import OutputClicker from './OutputClicker';
import editorModes from '../config/editorModes';
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

  const context = initContext({ type, userId: id });

  const config = {
    actions: {
      user_start_checking: () => {
        dispatch(GameActions.checkGameResult());
      },
    },
  };

  const [editorCurrent, send, service] = useMachine(editorMachine.withConfig(config), {
    context,
    devTools: true,
    id: `editor_${id}`,
  });

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

  const toolbarParams = {
    player: players[id],
    editor: editorState,
    status: editorCurrent.value,
    ...editorCurrent.context,
  };

  const editorParams = {
    syntax: editorState.currentLangSlug || 'javascript',
    onChange: editorCurrent.context.type === 'current_user' ? value => {
      updateEditorValue(value);
    } : _.noop(),
    checkResult,
    value: editorState.text,
    editorHeight,
    mode: editorCurrent.context.editable ? editorMode : editorModes.default,
    theme,
    ...editorCurrent.context,
  };

  const isWon = players[id].gameResult === 'won';

  const pannelBackground = cn('col-12 col-lg-6 p-1', {
    'bg-warning': editorCurrent.matches('checking'),
    'bg-primary': editorCurrent.matches('typing'),
    'bg-success': gameCurrent.matches('active') && editorCurrent.matches('idle') && editorCurrent.context.type === 'current_user',
    'bg-secondary': gameCurrent.matches('active') && editorCurrent.matches('idle') && editorCurrent.context.type === 'player',
    'bg-danger': gameCurrent.matches('active') && editorCurrent.matches('idle') && !isWon && editorCurrent.context.type === 'opponent',
    'bg-orange': gameCurrent.matches('game_over') && editorCurrent.matches('idle') && isWon,
  });

  return (
    <>
      <div
        data-editor-state={editorCurrent.value}
        className={pannelBackground}
      >
        <div className={cardClassName} style={{ minHeight: '470px' }} data-guide-id="LeftEditor">
          <EditorToolbar
            {...toolbarParams}
            toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1"
            editorSettingClassNames="btn-group align-items-center m-1"
            userInfoClassNames="btn-group align-items-center justify-content-end m-1"
          />
          {children({
            ...editorParams,
          })}
          {/* TODO: move state to parent component */}
          {editorCurrent.context.type === 'current_user'
              && (
                <GameActionButtons
                  checkResult={checkResult}
                  {...editorCurrent.context}
                />
              )}
        </div>
      </div>
    </>
  );
};

const GameWidget = () => {
  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const leftEditor = useSelector(selectors.leftEditorSelector);
  const rightEditor = useSelector(selectors.rightEditorSelector);
  const leftUserId = _.get(leftEditor, ['userId'], null);
  const rightUserId = _.get(rightEditor, ['userId'], null);
  const leftUserType = currentUserId === leftUserId ? 'current_user' : 'player';
  const rightUserType = leftUserType === 'current_user' ? 'opponent' : 'player';

  const leftEditorHeight = useSelector(selectors.editorHeightSelector(leftUserId));
  const rightEditorHeight = useSelector(selectors.editorHeightSelector(rightUserId));
  const rightOutput = useSelector(selectors.rightExecutionOutputSelector);
  const leftEditorsMode = useSelector(selectors.editorsModeSelector(leftUserId));
  const theme = useSelector(selectors.editorsThemeSelector(leftUserId));

  return (
    <>
      <EditorContainer
        id={leftUserId}
        type={leftUserType}
        editorState={leftEditor}
        cardClassName="card h-100 position-relative"
        theme={theme}
        editorHeight={leftEditorHeight}
        editorMode={leftEditorsMode}
      >
        {params => <Editor {...params} />}
      </EditorContainer>
      <EditorContainer
        id={rightUserId}
        type={rightUserType}
        editorState={rightEditor}
        cardClassName="card h-100"
        theme={theme}
        editorHeight={rightEditorHeight}
        editorMode={editorModes.default}
      >
        {params => (
          <RightSide output={rightOutput}>
            <Editor {...params} />
          </RightSide>
        )}
      </EditorContainer>
      <OutputClicker />
    </>
  );
};

export default GameWidget;
