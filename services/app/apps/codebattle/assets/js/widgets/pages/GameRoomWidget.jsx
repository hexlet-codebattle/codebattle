import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect, useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import ReactJoyride, { STATUS } from 'react-joyride';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import sound from '../lib/sound';
import userTypes from '../config/userTypes';

import RoomContext from '../components/RoomContext';
import WaitingOpponentInfo from './game/WaitingOpponentInfo';
import CodebattlePlayer from './game/CodebattlePlayer';
import * as GameRoomActions from '../middlewares/Game';
import * as ChatActions from '../middlewares/Chat';
import FeedbackWidget from '../components/FeedbackWidget';
import GameRoomPreview from './lobby/GameRoomPreview';
import TaskConfirmationModal from './builder/TaskConfirmationModal';
import TaskConfigurationModal from './builder/TaskConfigurationModal';
import AnimationModal from './game/AnimationModal';
import NetworkAlert from './game/NetworkAlert';

import GameWidget from './game/GameWidget';
import InfoWidget from './game/InfoWidget';
import BuilderSettingsWidget from './builder/BuilderSettingsWidget';
import BuilderEditorsWidget from './builder/BuilderEditorsWidget';

import useGameRoomMachine from '../utils/useGameRoomMachine';
import useMachineStateSelector from '../utils/useMachineStateSelector';
import {
  inPreviewRoomSelector,
  inBuilderRoomSelector,
  inWaitingRoomSelector,
  openedReplayerSelector,
  gameRoomKeySelector,
  roomStateSelector,
} from '../machines/selectors';
import { actions } from '../slices';
import { isShowGuideSelector } from '../selectors';

const steps = [
  {
    disableBeacon: true,
    disableOverlayClose: true,
    title: 'Game page',
    content: (
      <>
        <div className="text-justify">
          This is a
          <b> game page</b>
          . You need to solve the task
          <b> first </b>
          and pass all tests
          <b> successfully</b>
          .
        </div>
      </>
    ),
    locale: {
      skip: 'Skip guide',
    },
    placement: 'center',
    target: 'body',
  },
  {
    disableOverlayClose: true,
    target: '[data-guide-id="Task"]',
    title: 'Task',
    content: 'Read the task carefully, pay attention to examples',
    locale: {
      skip: 'Skip guide',
    },
  },
  {
    disableOverlayClose: true,
    spotlightClicks: true,
    target: '[data-guide-id="LeftEditor"] .guide-LanguagePicker',
    placement: 'top',
    title: 'Language',
    content: 'Choose the programming language that you like best',
    locale: {
      skip: 'Skip guide',
    },
  },
  {
    disableOverlayClose: true,
    target: '[data-guide-id="LeftEditor"] .react-monaco-editor-container',
    title: 'Editor',
    content: 'Write the solution of task in the editor',
    locale: {
      skip: 'Skip guide',
    },
  },
  {
    spotlightClicks: true,
    disableOverlayClose: true,
    styles: {
      options: {
        zIndex: 10000,
      },
    },
    target: '[data-guide-id="LeftEditor"] [data-guide-id="GiveUpButton"]',
    title: 'Give up button',
    content:
      'Click this button to give up. You will lose the game and can try it again next time, or ask your opponent to an immediate rematch',
    locale: {
      skip: 'Skip guide',
    },
  },
  {
    spotlightClicks: true,
    disableOverlayClose: true,
    styles: {
      options: {
        zIndex: 10000,
      },
    },
    target: '[data-guide-id="LeftEditor"] [data-guide-id="ResetButton"]',
    title: 'Reset button',
    content: 'Click this button to reset the code to the original template',
    locale: {
      skip: 'Skip guide',
    },
  },
  {
    spotlightClicks: true,
    disableOverlayClose: true,
    styles: {
      options: {
        zIndex: 10000,
      },
    },
    target: '[data-guide-id="LeftEditor"] [data-guide-id="CheckResultButton"]',
    title: 'Check button',
    content:
      'Click the button to check your solution or use Ctrl+Enter/Cmd+Enter',
    locale: {
      skip: 'Skip guide',
    },
  },
  {
    disableOverlayClose: true,
    target: '#leftOutput-tab',
    title: 'Result output',
    content:
      'Here you will see the results of the tests or compilation errors after check',
    locale: {
      skip: 'Skip guide',
    },
  },
];

function GameWidgetGuide() {
  const dispatch = useDispatch();
  const [isFirstTime, setIsFirstTime] = useState(
    window.localStorage.getItem('guideGamePassed') === null,
  );
  const isShowGuide = useSelector(state => isShowGuideSelector(state));

  return (
    (isShowGuide || isFirstTime) && (
      <ReactJoyride
        continuous
        run
        scrollToFirstStep
        showProgress
        showSkipButton
        steps={steps}
        spotlightPadding={6}
        callback={({ status }) => {
          if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            window.localStorage.setItem('guideGamePassed', 'true');
            setIsFirstTime(false);
            dispatch(actions.updateGameUI({ isShowGuide: false }));
          }
        }}
        styles={{
          options: {
            primaryColor: '#0275d8',
            zIndex: 1000,
          },
          buttonNext: {
            borderRadius: 'unset',
          },
        }}
      />
    )
  );
}

const currentUser = Gon.getAsset('current_user');

function GameRoomWidget({
  pageName,
  setCurrentUser,
  mainMachine,
  taskMachine,
  editorMachine,
  toggleMuteSound,
}) {
  const dispatch = useDispatch();

  const [taskModalShowing, setTaskModalShowing] = useState(false);
  const [taskConfigurationModalShowing, setTaskConfigurationModalShowing] = useState(false);
  const [resultModalShowing, setResultModalShowing] = useState(false);

  const mute = useSelector(state => state.userSettings.mute);
  const machines = useGameRoomMachine({
    setTaskModalShowing,
    setResultModalShowing,
    mainMachine,
    taskMachine,
  });

  const roomCurrent = useMachineStateSelector(
    machines.mainService,
    roomStateSelector,
  );
  const inBuilderRoom = inBuilderRoomSelector(roomCurrent);
  const inPreviewRoom = inPreviewRoomSelector(roomCurrent);
  const inWaitingRoom = inWaitingRoomSelector(roomCurrent);
  const replayerIsOpen = openedReplayerSelector(roomCurrent);
  const gameRoomKey = gameRoomKeySelector(roomCurrent);

  useEffect(() => {
    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...currentUser, type: userTypes.spectator } });
    if (pageName === 'builder') {
      const clearTask = GameRoomActions.connectToTask(machines.mainService, machines.taskService)(dispatch);

      return clearTask;
    }

    const clearGame = GameRoomActions.connectToGame(machines.mainService)(dispatch);
    const clearChat = ChatActions.connectToChat()(dispatch);

    return () => {
      clearGame();
      clearChat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const muteSound = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();

        if (mute) {
          sound.toggle();
        } else {
          sound.toggle(0);
        }

        toggleMuteSound();
      }
    };

    window.addEventListener('keydown', muteSound);

    return () => {
      window.removeEventListener('keydown', muteSound);
    };
  }, [mute, toggleMuteSound]);

  if (inWaitingRoom) {
    const gameUrl = window.location.href;
    return <WaitingOpponentInfo gameUrl={gameUrl} />;
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
        {inPreviewRoom ? (
          <GameRoomPreview className="animate" pageName={pageName} />
        ) : (
          <RoomContext.Provider value={machines}>
            <div className="x-outline-none">
              <GameWidgetGuide />
              <NetworkAlert />
              <div className="container-fluid">
                <div className="row no-gutter cb-game">
                  <TaskConfirmationModal
                    modalShowing={taskModalShowing}
                    taskService={machines.taskService}
                  />
                  <TaskConfigurationModal
                    modalShowing={taskConfigurationModalShowing}
                    setModalShowing={setTaskConfigurationModalShowing}
                  />
                  <AnimationModal
                    setModalShowing={setResultModalShowing}
                    modalShowing={resultModalShowing}
                  />
                  {inBuilderRoom ? (
                    <>
                      <BuilderSettingsWidget
                        setConfigurationModalShowing={
                          setTaskConfigurationModalShowing
                        }
                      />
                      <BuilderEditorsWidget />
                    </>
                  ) : (
                    <>
                      <InfoWidget />
                      <GameWidget editorMachine={editorMachine} />
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
                  {!replayerIsOpen && <FeedbackWidget />}
                </div>
              </div>
              {replayerIsOpen && <CodebattlePlayer roomCurrent={roomCurrent} />}
            </div>
          </RoomContext.Provider>
        )}
      </CSSTransition>
    </SwitchTransition>
  );
}

GameRoomWidget.propTypes = {
  setCurrentUser: PropTypes.func.isRequired,
};

const mapDispatchToProps = {
  setCurrentUser: actions.setCurrentUser,
  toggleMuteSound: actions.toggleMuteSound,
};

export default connect(null, mapDispatchToProps)(GameRoomWidget);
