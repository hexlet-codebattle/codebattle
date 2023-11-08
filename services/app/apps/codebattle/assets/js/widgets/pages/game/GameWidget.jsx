import React, { useState, useContext, memo } from 'react';

import cn from 'classnames';
import get from 'lodash/get';
import { useSelector } from 'react-redux';

import Editor from '../../components/Editor';
import RoomContext from '../../components/RoomContext';
import editorModes from '../../config/editorModes';
import editorUserTypes from '../../config/editorUserTypes';
import { roomStateSelector } from '../../machines/selectors';
import * as selectors from '../../selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import EditorContainer from './EditorContainer';
import Output from './Output';
import OutputTab from './OutputTab';

const EditorWrapper = ({ children, id, className }) => (
  <div id={id} className={className}>
    {children}
  </div>
);

function RightSide({ output, children }) {
  const [showTab, setShowTab] = useState('editor');
  const isShowOutput = output && output.status;
  const content = showTab === 'editor' ? (
    <EditorWrapper id="editor" className="d-flex flex-column flex-grow-1 position-relative">
      {children}
    </EditorWrapper>
  ) : (
    <div className="d-flex flex-column flex-grow-1 overflow-auto" style={{ maxHeight: '375px' }}>
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
}

function GameWidget({ editorMachine }) {
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const { mainService } = useContext(RoomContext);
  const roomCurrent = useMachineStateSelector(mainService, roomStateSelector);

  const leftEditor = useSelector(selectors.leftEditorSelector(roomCurrent));
  const rightEditor = useSelector(selectors.rightEditorSelector(roomCurrent));
  const leftUserId = get(leftEditor, ['userId'], null);
  const rightUserId = get(rightEditor, ['userId'], null);
  const leftUserType = currentUserId === leftUserId
    ? editorUserTypes.currentUser
    : editorUserTypes.player;
  const rightUserType = leftUserType === editorUserTypes.currentUser
    ? editorUserTypes.opponent
    : editorUserTypes.player;

  const leftEditorHeight = useSelector(selectors.editorHeightSelector(roomCurrent, leftUserId));
  const rightEditorHeight = useSelector(selectors.editorHeightSelector(roomCurrent, rightUserId));
  const rightOutput = useSelector(selectors.rightExecutionOutputSelector(roomCurrent));
  const leftEditorsMode = useSelector(selectors.editorsModeSelector);
  const theme = useSelector(selectors.editorsThemeSelector);

  return (
    <>
      <EditorContainer
        id={leftUserId}
        editorMachine={editorMachine}
        type={leftUserType}
        orientation="left"
        editorState={leftEditor}
        cardClassName="card h-100 shadow-sm position-relative"
        theme={theme}
        editorHeight={leftEditorHeight}
        editorMode={leftEditorsMode}
      >
        {params => (
          <Editor {...params} />
        )}
      </EditorContainer>
      <EditorContainer
        id={rightUserId}
        editorMachine={editorMachine}
        type={rightUserType}
        orientation="right"
        editorState={rightEditor}
        cardClassName="card h-100 shadow-sm"
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
    </>
  );
}

export default memo(GameWidget);
