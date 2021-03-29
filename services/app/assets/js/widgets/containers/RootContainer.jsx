import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect, useSelector, useDispatch } from 'react-redux';
import Gon from 'gon';
import ReactJoyride, { STATUS } from 'react-joyride';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { useMachine } from '@xstate/react';

import GameWidget from './GameWidget';
import GameContext from './GameContext';
import InfoWidget from './InfoWidget';
import userTypes from '../config/userTypes';
import { actions } from '../slices';
import * as GameActions from '../middlewares/Game';
import * as ChatActions from '../middlewares/Chat';
import {
  isShowGuideSelector,
} from '../selectors';
import WaitingOpponentInfo from '../components/WaitingOpponentInfo';
import CodebattlePlayer from './CodebattlePlayer';
import FeedBackWidget from '../components/FeedBackWidget';
import GamePreview from '../components/Game/GamePreview';
import gameMachine, { replayerMachineStates } from '../machines/game';

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
          .
          You need to solve the task
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
    disableBeacon: true,
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

const GameWidgetGuide = () => {
  const dispatch = useDispatch();
  const [isFirstTime, setIsFirstTime] = useState(window.localStorage.getItem('guideGamePassed') === null);
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
        }}
      />
    )
  );
};

const currentUser = Gon.getAsset('current_user');
const players = Gon.getAsset('players');

const RootContainer = ({
  connectToGame,
  connectToChat,
  setCurrentUser,
}) => {
  const [current, send, service] = useMachine(gameMachine, {
    devTools: true,
  });

  useEffect(() => {
    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...currentUser, type: userTypes.spectator } });
    connectToGame(service);
    connectToChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (current.matches({ game: 'waiting' })) {
    const gameUrl = window.location.href;
    return <WaitingOpponentInfo gameUrl={gameUrl} />;
  }

  const isRenderPreview = current.matches({ game: 'preview' });

  const defaultPlayer = {
    name: 'John Doe', github_id: 35539033, lang: 'js', rating: '0',
  };
  const player1 = players[0] || defaultPlayer;
  const player2 = players[1] || defaultPlayer;

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        key={isRenderPreview ? 'preview' : 'game'}
        addEndListener={(node, done) => {
          node.addEventListener('transitionend', done, false);
        }}
        classNames="preview"
      >
        {isRenderPreview
          ? (<GamePreview className="animate" player1={player1} player2={player2} />)
          : (
            <GameContext.Provider value={{ current, send, service }}>
              <div className="x-outline-none">
                <GameWidgetGuide />
                <div className="container-fluid">
                  <div className="row no-gutter cb-game">
                    <InfoWidget />
                    <GameWidget />
                    <FeedBackWidget />
                  </div>
                </div>
                {current.matches({ replayer: replayerMachineStates.on }) && <CodebattlePlayer />}
              </div>
            </GameContext.Provider>
          )}

      </CSSTransition>
    </SwitchTransition>
  );
};

RootContainer.propTypes = {
  setCurrentUser: PropTypes.func.isRequired,
  connectToGame: PropTypes.func.isRequired,
};

const mapDispatchToProps = {
  setCurrentUser: actions.setCurrentUser,
  connectToGame: GameActions.connectToGame,
  connectToChat: ChatActions.connectToChat,
};

export default connect(null, mapDispatchToProps)(RootContainer);
