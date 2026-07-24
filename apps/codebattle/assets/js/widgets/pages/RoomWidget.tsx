import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

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
              className={cn('container-fluid', {
                'd-none': roomLocked,
                invisible: !visible,
              })}
            >
              <div className="row no-gutters cb-game px-1">
                {showBattleRoom && (
                  <>
                    <InfoWidget viewMode={viewMode} />
                    <GameWidget viewMode={viewMode} editorMachine={editorMachine} />
                  </>
                )}
                {mute && (
                  <div className="cb-rounded p-2 bg-dark cb-mute-icon">
                    <FontAwesomeIcon size="lg" color="white" icon={['fas', 'volume-mute']} />
                  </div>
                )}
                {!showReplayer && <FeedbackWidget />}
              </div>
            </div>
            {showReplayer && <CodebattlePlayer roomMachineState={roomMachineState} />}
          </div>
          <div
            style={{ minHeight: 'calc(100vh - 92px)' }}
            className={cn('justify-content-center align-items-center', {
              'd-none': !roomLocked,
              'd-flex': roomLocked,
            })}
          >
            <GameRoomLockPanel />
          </div>
        </RoomContext.Provider>
      </CSSTransition>
    </SwitchTransition>
  );
}

export default RoomWidget;
