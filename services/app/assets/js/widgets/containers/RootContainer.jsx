import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { useHotkeys } from 'react-hotkeys-hook';
import Gon from 'gon';
import ReactJoyride, { STATUS } from 'react-joyride';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import userTypes from '../config/userTypes';
import { actions } from '../slices';
import * as GameActions from '../middlewares/Game';
import GameStatusCodes from '../config/gameStatusCodes';
import { gameStatusSelector } from '../selectors';
import WaitingOpponentInfo from '../components/WaitingOpponentInfo';
import CodebattlePlayer from './CodebattlePlayer';

const steps = [
  {
    disableBeacon: true,
    target: '[data-tutorial-id="Task"]',
    title: 'Задача',
    content: 'Внимательно прочитайте задачу, обратите внимание на примеры',
  },
  {
    target: '[data-tutorial-id="LeftEditor"] .tutorial-LanguagePicker',
    title: 'Выбор языка',
    content: 'Выберите язык программирования который вам больше нравится ',
  },
  {
    target: '[data-tutorial-id="LeftEditor"] .react-monaco-editor-container',
    title: 'Редактор',
    content: 'Введите ваше решение, будьте внимательны к ошибкам',
  },
  {
    target: '[data-tutorial-id="LeftEditor"] [data-tutorial-id="CheckResultButton"]',
    title: 'Кнопка проверки',
    content: 'Нажмите для проверки вашего решения',

  },
];
const GameWidgetTutorial = () => {
  const isFirstTime = window.localStorage.getItem('tutorialPassed') === null;
  return (isFirstTime && (
  <ReactJoyride
    continuous
    run
    scrollToFirstStep
    showProgress
    showSkipButton
    steps={steps}
    spotlightPadding={6}
    callback={({ status }) => {
      if (([STATUS.FINISHED, STATUS.SKIPPED]).includes(status)) {
        window.localStorage.setItem('tutorialPassed', 'false');
      }
    }}
    styles={{
    options: {
      primaryColor: '#0275d8',
      zIndex: 1000,
    },
  }}
  />
));
};

const RootContainer = ({
  storeLoaded, gameStatusCode, checkResult, init, setCurrentUser,
}) => {
  useEffect(() => {
    const user = Gon.getAsset('current_user');
    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...user, type: userTypes.spectator } });
    init();
  }, [init, setCurrentUser]);

  useHotkeys('ctrl+enter, command+enter', e => {
    e.preventDefault();
    checkResult();
  }, [], { filter: () => true });

  if (!storeLoaded) {
    // TODO: add loader
    return null;
  }

  if (gameStatusCode === GameStatusCodes.waitingOpponent) {
    const gameUrl = window.location.href;
    return <WaitingOpponentInfo gameUrl={gameUrl} />;
  }

  const isStoredGame = gameStatusCode === GameStatusCodes.stored;

  return (
    <div className="x-outline-none">
      <GameWidgetTutorial />
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
