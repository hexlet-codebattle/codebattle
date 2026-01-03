import React, {
 useState, useContext, memo, useMemo,
} from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import isEqual from 'lodash/isEqual';
import { useSelector } from 'react-redux';

// import ExtendedEditor from '../../components/ExtendedEditor';
import ExtendedEditor from '../../components/Editor';
import RoomContext from '../../components/RoomContext';
import BattleRoomViewModes from '../../config/battleRoomViewModes';
import { roomStateSelector } from '../../machines/selectors';
import { editorsPanelOptionsSelector } from '../../selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import EditorContainer from './EditorContainer';
import Output from './Output';
import OutputTab from './OutputTab';

function EditorWrapper({ children, id, className }) {
  return (
    <div id={id} translate="no" className={className}>
      {children}
    </div>
  );
}

function RightSide({ output, children }) {
  const [showTab, setShowTab] = useState('editor');
  const isShowOutput = output && output.status;
  const content = showTab === 'editor' ? (
    <EditorWrapper id="editor" className="d-flex flex-column flex-grow-1 position-relative cb-editor-height">
      {children}
    </EditorWrapper>
  ) : (
    <div className="d-flex flex-column flex-grow-1 overflow-auto" style={{ maxHeight: '375px' }}>
      <div className="h-auto user-select-none">
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
              'nav-item nav-link flex-grow-1 rounded-0 px-5',
              { active: showTab === 'editor' },
            )}
            href="#Editor"
            onClick={(e) => {
              e.preventDefault();
              setShowTab('editor');
            }}
          >
            {i18next.t('Editor')}
          </a>
          <a
            className={cn(
              'nav-item nav-link flex-grow-1 rounded-0 p-2 block',
              { active: showTab === 'output' },
            )}
            href="#Output"
            onClick={(e) => {
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

function GameWidget({ viewMode, editorMachine }) {
  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const selector = useMemo(
    () => editorsPanelOptionsSelector(viewMode, roomMachineState),
    [viewMode, roomMachineState],
  );

  const editors = useSelector(selector, isEqual);

  return (
    <>
      {viewMode === BattleRoomViewModes.duel && (
        <>
          <EditorContainer
            orientation="left"
            cardClassName="card cb-card h-100 shadow-sm position-relative border-0"
            editorContainerClassName="col-12 col-lg-6 p-1"
            editorMachine={editorMachine}
            {...editors[0]}
          >
            {(params) => (
              <EditorWrapper id="main-editor" className="d-flex flex-column flex-grow-1 position-relative cb-editor-height">
                <ExtendedEditor {...params} />
              </EditorWrapper>
            )}
          </EditorContainer>
          <EditorContainer
            orientation="right"
            cardClassName="card cb-card h-100 shadow-sm border-0"
            editorContainerClassName="col-12 col-lg-6 p-1"
            editorMachine={editorMachine}
            {...editors[1]}
          >
            {(params) => (
              <RightSide output={editors[1].output}>
                <ExtendedEditor {...params} />
              </RightSide>
            )}
          </EditorContainer>
        </>
      )}
      {viewMode === BattleRoomViewModes.single && (
        <div
          className="d-flex flex-column col-12 col-xl-8 col-lg-6 px-1"
          style={{ height: 'calc(100vh - 92px)' }}
        >
          <EditorContainer
            orientation="side"
            cardClassName="card cb-card h-100 shadow-sm"
            editorContainerClassName="col-12 p-1"
            editorMachine={editorMachine}
            {...editors[0]}
          >
            {(params) => (
              <EditorWrapper id="main-editor" className="d-flex flex-column flex-grow-1 position-relative">
                <ExtendedEditor {...params} />
              </EditorWrapper>
            )}
          </EditorContainer>
        </div>
      )}
    </>
  );
}

export default memo(GameWidget);
