import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

import { Flex } from '@mantine/core';

import FeedbackAlertNotification from '../components/FeedbackAlertNotification';
import FeedbackWidget from '../components/FeedbackWidget';
// import GameWidgetGuide from '../components/GameWidgetGuide';
import RoomContext from '../components/RoomContext';
import * as machineSelectors from '../machines/selectors';
import useGameRoomMachine from '../utils/useGameRoomMachine';
import useGameRoomModals from '../utils/useGameRoomModals';
import useGameRoomSocketChannel from '../utils/useGameRoomSocketChannel';
import useGameRoomSoundSettings from '../utils/useGameRoomSoundSettings';
import useMachineStateSelector from '../utils/useMachineStateSelector';
import useRoomSettings from '../utils/useRoomSettings';

import CodebattlePlayer from './game/CodebattlePlayer';
import GameRoomLockPanel from './game/GameRoomLockPanel';
import GameWidget from './game/GameWidget';
import InfoWidget from './game/InfoWidget';
import NetworkAlert from './game/NetworkAlert';
import TimeoutGameInfo from './game/TimeoutGameInfo';
import WaitingOpponentInfo from './game/WaitingOpponentInfo';

interface RoomWidgetProps {
  pageName: string;
  // xstate v4 machines expose no shared type — typed loosely per migration conventions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mainMachine: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taskMachine: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorMachine: any;
}

function RoomWidget({ pageName, mainMachine, taskMachine, editorMachine }: RoomWidgetProps) {
  const machines = useGameRoomMachine({
    mainMachine,
    taskMachine,
  });

  const roomMachineState = useMachineStateSelector(
    machines.mainService,
    machineSelectors.roomStateSelector,
  );
  const gameRoomKey = machineSelectors.gameRoomKeySelector();

  const mute = useGameRoomSoundSettings();
  const {
    // tournamentId,
    viewMode,
    showWaitingOpponent,
    showBattleRoom,
    showTimeoutMessage,
    showReplayer,
    roomLocked = false,
    visible = true,
  } = useRoomSettings(pageName, roomMachineState);
  useGameRoomModals();
  useGameRoomSocketChannel(pageName, machines);

  if (showWaitingOpponent) {
    const gameUrl = window.location.href;
    return <WaitingOpponentInfo gameUrl={gameUrl} />;
  }

  if (showTimeoutMessage) {
    return <TimeoutGameInfo />;
  }

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        key={gameRoomKey}
        addEndListener={(node: HTMLElement, done: () => void) => {
          node.addEventListener('transitionend', done, false);
        }}
        classNames={`game-room-${gameRoomKey}`}
      >
        <RoomContext.Provider value={machines}>
          <div className="x-outline-none">
            {/* <GameWidgetGuide tournamentId={tournamentId} /> */}
            <NetworkAlert />
            <FeedbackAlertNotification />
            <div
              style={{
                width: '100%',
                display: roomLocked ? 'none' : undefined,
                visibility: visible ? undefined : 'hidden',
              }}
            >
              <Flex wrap="wrap" className="cb-game" px={4}>
                {showBattleRoom && (
                  <>
                    <InfoWidget viewMode={viewMode} />
                    <GameWidget viewMode={viewMode} editorMachine={editorMachine} />
                  </>
                )}
                {mute && (
                  <div
                    className="cb-rounded"
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#212529',
                    }}
                  >
                    <FontAwesomeIcon size="lg" color="white" icon={['fas', 'volume-mute']} />
                  </div>
                )}
                {!showReplayer && <FeedbackWidget />}
              </Flex>
            </div>
            {showReplayer && <CodebattlePlayer roomMachineState={roomMachineState} />}
          </div>
          <div
            style={{
              minHeight: 'calc(100vh - 92px)',
              display: roomLocked ? 'flex' : 'none',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <GameRoomLockPanel />
          </div>
        </RoomContext.Provider>
      </CSSTransition>
    </SwitchTransition>
  );
}

export default RoomWidget;
