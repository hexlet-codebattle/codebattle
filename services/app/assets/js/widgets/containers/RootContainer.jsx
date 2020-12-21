import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import { useHotkeys } from 'react-hotkeys-hook';
import Gon from 'gon';
import ReactJoyride, { STATUS } from 'react-joyride';
import _ from 'lodash';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import userTypes from '../config/userTypes';
import { actions } from '../slices';
import * as GameActions from '../middlewares/Game';
import GameStatusCodes from '../config/gameStatusCodes';
import {
  gameStatusSelector,
  gamePlayersSelector,
  currentUserIdSelector,
} from '../selectors';
import WaitingOpponentInfo from '../components/WaitingOpponentInfo';
import CodebattlePlayer from './CodebattlePlayer';
import GamePreview from '../components/Game/GamePreview';

const steps = [
  {
    disableBeacon: true,
    disableOverlayClose: true,
    title: 'Training game page',
    content: (
      <>
        <div className="text-justify">
          This is a
          <b> training game </b>
          against a
          <b> bot</b>
          . But in the future you’ll be against the real
          player You need must solve the task
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
    target: '[data-guide-id="LeftEditor"] #accordionExample',
    title: 'Result output',
    content:
      'Here you will see the results of the tests or compilation errors after check',
    locale: {
      skip: 'Skip guide',
    },
  },
];
const GameWidgetGuide = () => {
  const isActiveGame = useSelector(
    state => gameStatusSelector(state).status === GameStatusCodes.playing,
  );
  const players = useSelector(state => gamePlayersSelector(state));
  const currentUser = useSelector(state => currentUserIdSelector(state));
  const isCurrentPlayer = _.has(players, currentUser);
  const isFirstTime = window.localStorage.getItem('guideGamePassed') === null;

  return (
    isFirstTime
    && isActiveGame
    && isCurrentPlayer && (
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

const RootContainer = ({
  storeLoaded,
  gameStatusCode,
  checkResult,
  init,
  setCurrentUser,
}) => {
  useEffect(() => {
    const user = Gon.getAsset('current_user');
    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...user, type: userTypes.spectator } });
    init();
  }, [init, setCurrentUser]);

  useHotkeys(
    'ctrl+enter, command+enter',
    e => {
      e.preventDefault();
      checkResult();
    },
    [],
    { filter: () => true },
  );

  const players = Gon.getAsset('players');

  if (!storeLoaded && players) {
    const defaultPlayer = {
      name: 'John Doe', github_id: 35539033, lang: 'js', rating: '0',
    };
    const player1 = players[0] || defaultPlayer;
    const player2 = players[1] || defaultPlayer;
    return <GamePreview player1={player1} player2={player2} />;
  }

  if (gameStatusCode === GameStatusCodes.waitingOpponent) {
    const gameUrl = window.location.href;
    return <WaitingOpponentInfo gameUrl={gameUrl} />;
  }

  const isStoredGame = gameStatusCode === GameStatusCodes.stored;

  return (
    <div className="x-outline-none">
      <GameWidgetGuide />
      <div className="container-fluid">
        <div className="row no-gutter cb-game">
          <InfoWidget />
          <GameWidget />
        </div>
      </div>
      {isStoredGame && <CodebattlePlayer />}
    </div>
  );
};

RootContainer.propTypes = {
  storeLoaded: PropTypes.bool.isRequired,
  setCurrentUser: PropTypes.func.isRequired,
  init: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  storeLoaded: state.storeLoaded,
  gameStatusCode: gameStatusSelector(state).status,
});

const mapDispatchToProps = {
  setCurrentUser: actions.setCurrentUser,
  init: GameActions.init,
  checkResult: GameActions.checkGameResult,
};

export default connect(mapStateToProps, mapDispatchToProps)(RootContainer);
