import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
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

function RoomWidget({
  pageName,
  mainMachine,
  taskMachine,
  editorMachine,
}) {
  const machines = useGameRoomMachine({
    mainMachine,
    taskMachine,
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
    disabled = false,
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
                  'd-none': roomLocked || disabled,
                },
              )}
            >
              <div className="row no-gutter cb-game">
                {showTaskBuilder && (
                  <>
                    <BuilderSettingsWidget />
                    <BuilderEditorsWidget />
                  </>
                )}
                {showBattleRoom && (
                  <>
                    <InfoWidget viewMode={viewMode} />
                    <GameWidget viewMode={viewMode} editorMachine={editorMachine} />
                  </>
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
