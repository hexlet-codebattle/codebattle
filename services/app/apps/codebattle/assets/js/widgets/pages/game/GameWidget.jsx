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

function EditorWrapper({ children, className, id }) {
  return (
    <div className={className} id={id}>
      {children}
    </div>
  );
}

function RightSide({ children, output }) {
  const [showTab, setShowTab] = useState('editor');
  const isShowOutput = output && output.status;
  const content =
    showTab === 'editor' ? (
      <EditorWrapper className="d-flex flex-column flex-grow-1 position-relative" id="editor">
        {children}
      </EditorWrapper>
    ) : (
      <div className="d-flex flex-column flex-grow-1 overflow-auto">
        <div className="h-auto">{isShowOutput && <Output sideOutput={output} />}</div>
      </div>
    );

  return (
    <>
      {content}
      <nav>
        <div
          className="nav nav-tabs bg-gray text-uppercase text-center font-weight-bold"
          id="nav-tab"
          role="tablist"
        >
          <a
            href="#Editor"
            className={cn('nav-item nav-link flex-grow-1 text-black rounded-0 px-5', {
              active: showTab === 'editor',
            })}
            onClick={(e) => {
              e.preventDefault();
              setShowTab('editor');
            }}
          >
            Editor
          </a>
          <a
            href="#Output"
            className={cn('nav-item nav-link flex-grow-1 text-black rounded-0 p-2 block', {
              active: showTab === 'output',
            })}
            onClick={(e) => {
              e.preventDefault();
              setShowTab('output');
            }}
          >
            {isShowOutput && <OutputTab side="right" sideOutput={output} />}
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
  const leftUserType =
    currentUserId === leftUserId ? editorUserTypes.currentUser : editorUserTypes.player;
  const rightUserType =
    leftUserType === editorUserTypes.currentUser
      ? editorUserTypes.opponent
      : editorUserTypes.player;

  const leftEditorHeight = useSelector(selectors.editorHeightSelector(roomCurrent, leftUserId));
  const rightEditorHeight = useSelector(selectors.editorHeightSelector(roomCurrent, rightUserId));
  const rightOutput = useSelector(selectors.rightExecutionOutputSelector(roomCurrent));
  const leftEditorsMode = useSelector(selectors.editorsModeSelector(leftUserId));
  const theme = useSelector(selectors.editorsThemeSelector(leftUserId));

  return (
    <>
      <EditorContainer
        cardClassName="card h-100 shadow-sm position-relative"
        editorHeight={leftEditorHeight}
        editorMachine={editorMachine}
        editorMode={leftEditorsMode}
        editorState={leftEditor}
        id={leftUserId}
        orientation="left"
        theme={theme}
        type={leftUserType}
      >
        {(params) => <Editor {...params} />}
      </EditorContainer>
      <EditorContainer
        cardClassName="card h-100 shadow-sm"
        editorHeight={rightEditorHeight}
        editorMachine={editorMachine}
        editorMode={editorModes.default}
        editorState={rightEditor}
        id={rightUserId}
        orientation="right"
        theme={theme}
        type={rightUserType}
      >
        {(params) => (
          <RightSide output={rightOutput}>
            <Editor {...params} />
          </RightSide>
        )}
      </EditorContainer>
    </>
  );
}

export default memo(GameWidget);
