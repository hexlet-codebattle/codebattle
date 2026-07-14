import React, { useState, useContext, memo, useMemo, type ReactNode } from 'react';

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
import Output, { type OutputData } from './Output';
import OutputTab from './OutputTab';

interface EditorWrapperProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

function EditorWrapper({ children, id, className }: EditorWrapperProps) {
  return (
    <div id={id} translate="no" className={className}>
      {children}
    </div>
  );
}

interface RightSideProps {
  output?: OutputData;
  children: ReactNode;
}

function RightSide({ output, children }: RightSideProps) {
  const [showTab, setShowTab] = useState('editor');
  const isShowOutput = output && output.status;
  const content =
    showTab === 'editor' ? (
      <EditorWrapper
        id="editor"
        className="d-flex flex-column flex-grow-1 position-relative cb-editor-height"
      >
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
        <div
          className="nav nav-tabs bg-gray text-uppercase text-center font-weight-bold"
          id="nav-tab"
          role="tablist"
        >
          <a
            className={cn('nav-item nav-link flex-grow-1 rounded-0 px-5', {
              active: showTab === 'editor',
            })}
            href="#Editor"
            onClick={(e) => {
              e.preventDefault();
              setShowTab('editor');
            }}
          >
            {i18next.t('Editor')}
          </a>
          <a
            className={cn('nav-item nav-link flex-grow-1 rounded-0 p-2 block', {
              active: showTab === 'output',
            })}
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

interface GameWidgetProps {
  viewMode: string;
  // xstate v4 editor machine — no usable exported type (see conventions rule 7)
  editorMachine: any;
}

function GameWidget({ viewMode, editorMachine }: GameWidgetProps) {
  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const selector = useMemo(
    () => editorsPanelOptionsSelector(viewMode, roomMachineState),
    [viewMode, roomMachineState],
  );

  // editorsPanelOptionsSelector returns heterogeneous per-editor option objects
  // (left/right/single) whose union is not usefully narrowable here.
  const editors = useSelector(selector, isEqual) as Array<
    {
      id?: number;
      type: string;
      theme?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editorState?: any;
      editorHeight?: unknown;
      editorMode?: string;
      output?: OutputData;
    } & Record<string, unknown>
  >;

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
              <EditorWrapper
                id="main-editor"
                className="d-flex flex-column flex-grow-1 position-relative cb-editor-height"
              >
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
              <EditorWrapper
                id="main-editor"
                className="d-flex flex-column flex-grow-1 position-relative"
              >
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
