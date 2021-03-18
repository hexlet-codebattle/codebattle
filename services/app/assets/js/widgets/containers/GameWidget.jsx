import React, { useState, useContext } from 'react';
import _ from 'lodash';
import { useSelector } from 'react-redux';
import cn from 'classnames';
import GameContext from './GameContext';
import * as selectors from '../selectors';
import Editor from './Editor';
import EditorContainer from './EditorContainer';
import OutputClicker from './OutputClicker';
import editorModes from '../config/editorModes';
import OutputTab from '../components/ExecutionOutput/OutputTab';
import Output from '../components/ExecutionOutput/Output';
import editorUserTypes from '../config/editorUserTypes';

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

const GameWidget = () => {
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const { current: gameCurrent } = useContext(GameContext);

  const leftEditor = useSelector(selectors.leftEditorSelector(gameCurrent));
  const rightEditor = useSelector(selectors.rightEditorSelector(gameCurrent));
  const leftUserId = _.get(leftEditor, ['userId'], null);
  const rightUserId = _.get(rightEditor, ['userId'], null);
  const leftUserType = currentUserId === leftUserId
    ? editorUserTypes.currentUser
    : editorUserTypes.player;
  const rightUserType = leftUserType === editorUserTypes.currentUser
    ? editorUserTypes.opponent
    : editorUserTypes.player;

  const leftEditorHeight = useSelector(selectors.editorHeightSelector(gameCurrent, leftUserId));
  const rightEditorHeight = useSelector(selectors.editorHeightSelector(gameCurrent, rightUserId));
  const rightOutput = useSelector(selectors.rightExecutionOutputSelector(gameCurrent));
  const leftEditorsMode = useSelector(selectors.editorsModeSelector(leftUserId));
  const theme = useSelector(selectors.editorsThemeSelector(leftUserId));

  return (
    <>
      <EditorContainer
        id={leftUserId}
        type={leftUserType}
        orientation="left"
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
        orientation="right"
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
