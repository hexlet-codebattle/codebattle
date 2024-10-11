import React, { useEffect, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import Split from 'react-split';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

import FeedbackAlertNotification from '../components/FeedbackAlertNotification';
import FeedbackWidget from '../components/FeedbackWidget';
import GameWidgetGuide from '../components/GameWidgetGuide';
import RoomContext from '../components/RoomContext';
import * as machineSelectors from '../machines/selectors';
import useGameRoomMachine from '../utils/useGameRoomMachine';
import useGameRoomModals from '../utils/useGameRoomModals';
import useGameRoomSocketChannel from '../utils/useGameRoomSocketChannel';
import useGameRoomSoundSettings from '../utils/useGameRoomSoundSettings';
import useMachineStateSelector from '../utils/useMachineStateSelector';
import useRoomSettings from '../utils/useRoomSettings';

import BuilderEditorsWidget from './builder/BuilderEditorsWidget';
import BuilderSettingsWidget from './builder/BuilderSettingsWidget';
import CodebattlePlayer from './game/CodebattlePlayer';
import GameRoomLockPanel from './game/GameRoomLockPanel';
import GameWidget from './game/GameWidget';
import InfoWidget from './game/InfoWidget';
import NetworkAlert from './game/NetworkAlert';
import TimeoutGameInfo from './game/TimeoutGameInfo';
import WaitingOpponentInfo from './game/WaitingOpponentInfo';

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

export function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}

function PanelsSplitPane({ children, viewMode }) {
  const dimensions = useWindowDimensions();

  if (viewMode !== 'duel' || dimensions.width < 992) return children;

  return (
    <Split
      style={{ maxHeight: 'calc(100vh - 77px)' }}
      sizes={[33, 62]}
      className="d-flex flex-column w-100"
      direction="vertical"
      gutterSize={5}
      gutterAlign="center"
      cursor="row-resize"
    >
      <div style={{ minHeight: 300 }} className="d-flex w-100">{children[0]}</div>
      <div style={{ minHeight: 200 }} className="d-flex w-100 cb-overflow-y-hidden">{children[1]}</div>
    </Split>
  );
}

function RoomWidget({
  pageName,
  mainMachine,
  taskMachine,
  waitingRoomMachine,
  editorMachine,
}) {
  const machines = useGameRoomMachine({
    mainMachine,
    taskMachine,
    waitingRoomMachine,
  });

  const roomMachineState = useMachineStateSelector(
    machines.mainService,
    machineSelectors.roomStateSelector,
  );
  const gameRoomKey = machineSelectors.gameRoomKeySelector(roomMachineState);

  const mute = useGameRoomSoundSettings();
  const {
    tournamentId,
    viewMode,
    showWaitingRoom,
    showBattleRoom,
    showTaskBuilder,
    showTimeoutMessage,
    showReplayer,
    roomLocked = false,
    visible = true,
  } = useRoomSettings(pageName, roomMachineState);
  useGameRoomModals(machines);
  useGameRoomSocketChannel(pageName, machines);

  if (showWaitingRoom) {
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
        addEndListener={(node, done) => {
          node.addEventListener('transitionend', done, false);
        }}
        classNames={`game-room-${gameRoomKey}`}
      >
        <RoomContext.Provider value={machines}>
          <div className="x-outline-none">
            <GameWidgetGuide tournamentId={tournamentId} />
            <NetworkAlert />
            <FeedbackAlertNotification />
            <div
              className={cn(
                'container-fluid', {
                  'd-none': roomLocked,
                  invisible: !visible,
                },
              )}
            >
              <div className="row no-gutter cb-game">
                {showTaskBuilder && (
                  <PanelsSplitPane viewMode={viewMode}>
                    <BuilderSettingsWidget />
                    <BuilderEditorsWidget />
                  </PanelsSplitPane>
                )}
                {showBattleRoom && (
                  <PanelsSplitPane viewMode={viewMode}>
                    <InfoWidget viewMode={viewMode} />
                    <GameWidget viewMode={viewMode} editorMachine={editorMachine} />
                  </PanelsSplitPane>
                )}
                {mute && (
                  <div className="rounded p-2 bg-dark cb-mute-icon">
                    <FontAwesomeIcon
                      size="lg"
                      color="white"
                      icon={['fas', 'volume-mute']}
                    />
                  </div>
                )}
                {!showReplayer && <FeedbackWidget />}
              </div>
            </div>
            {showReplayer && <CodebattlePlayer roomMachineState={roomMachineState} />}
          </div>
          <div
            style={{ minHeight: 'calc(100vh - 92px)' }}
            className={cn(
              'justify-content-center align-items-center',
              {
                'd-none': !roomLocked,
                'd-flex': roomLocked,
              },
            )}
          >
            <GameRoomLockPanel />
          </div>
        </RoomContext.Provider>
      </CSSTransition>
    </SwitchTransition>
  );
}

export default RoomWidget;
