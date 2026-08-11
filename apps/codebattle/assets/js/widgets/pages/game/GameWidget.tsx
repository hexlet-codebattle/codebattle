import React, { useState, useContext, memo, useMemo, type ReactNode } from 'react';

import { Box, Flex, Tabs } from '@mantine/core';
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
    <div
      id={id}
      translate="no"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        position: 'relative',
      }}
    >
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
      <EditorWrapper id="editor" className="cb-editor-height">
        {children}
      </EditorWrapper>
    ) : (
      <Flex direction="column" flex={1} style={{ overflowY: 'auto', maxHeight: '375px' }}>
        <Box h="auto" style={{ userSelect: 'none' }}>
          {isShowOutput && <Output sideOutput={output} />}
        </Box>
      </Flex>
    );

  return (
    <>
      {content}
      <Tabs value={showTab} onChange={(value) => setShowTab(value ?? 'editor')} variant="default">
        <Tabs.List className="bg-gray" id="nav-tab" grow tt="uppercase" fw={700} ta="center">
          <Tabs.Tab value="editor" px={{ base: 'xs', sm: 'xl' }} style={{ borderRadius: 0 }}>
            {i18next.t('Editor')}
          </Tabs.Tab>
          <Tabs.Tab value="output" p="xs" style={{ borderRadius: 0 }}>
            {isShowOutput && <OutputTab sideOutput={output} side="right" />}
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
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
            cardClassName="cb-card"
            editorContainerClassName="cb-col-12 cb-col-lg-6"
            editorMachine={editorMachine}
            {...editors[0]}
          >
            {(params) => (
              <EditorWrapper id="main-editor" className="cb-editor-height">
                <ExtendedEditor {...params} />
              </EditorWrapper>
            )}
          </EditorContainer>
          <EditorContainer
            orientation="right"
            cardClassName="cb-card"
            editorContainerClassName="cb-col-12 cb-col-lg-6"
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
        <Flex
          direction="column"
          w={{ base: '100%', lg: '50%', xl: '66.6667%' }}
          px="xs"
          style={{ height: 'calc(100vh - 92px)' }}
        >
          <EditorContainer
            orientation="side"
            cardClassName="cb-card"
            editorContainerClassName="cb-col-12"
            editorMachine={editorMachine}
            {...editors[0]}
          >
            {(params) => (
              <EditorWrapper id="main-editor">
                <ExtendedEditor {...params} />
              </EditorWrapper>
            )}
          </EditorContainer>
        </Flex>
      )}
    </>
  );
}

export default memo(GameWidget);
