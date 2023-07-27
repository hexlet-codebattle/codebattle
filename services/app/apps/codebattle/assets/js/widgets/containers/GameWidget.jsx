import React, { useState, useContext } from 'react';
import _ from 'lodash';
import { useSelector } from 'react-redux';
import cn from 'classnames';
import RoomContext from './RoomContext';
import * as selectors from '../selectors';
import Editor from './Editor';
import EditorContainer from './EditorContainer';
import editorModes from '../config/editorModes';
import OutputTab from '../components/ExecutionOutput/OutputTab';
import Output from '../components/ExecutionOutput/Output';
import editorUserTypes from '../config/editorUserTypes';
import { roomStateSelector } from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';

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

const GameWidget = ({ editorMachine }) => {
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const { mainService } = useContext(RoomContext);
  const roomCurrent = useMachineStateSelector(mainService, roomStateSelector);

  const leftEditor = useSelector(selectors.leftEditorSelector(roomCurrent));
  const rightEditor = useSelector(selectors.rightEditorSelector(roomCurrent));
  const leftUserId = _.get(leftEditor, ['userId'], null);
  const rightUserId = _.get(rightEditor, ['userId'], null);
  const leftUserType = currentUserId === leftUserId
    ? editorUserTypes.currentUser
    : editorUserTypes.player;
  const rightUserType = leftUserType === editorUserTypes.currentUser
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
        {params => <Editor {...params} />}
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
};

export default GameWidget;
