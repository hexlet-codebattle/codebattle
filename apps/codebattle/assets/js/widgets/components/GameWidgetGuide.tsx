import React, { useState, memo } from 'react';

import { Joyride, STATUS, type EventData, type Status, type Step } from 'react-joyride';
import { useDispatch, useSelector } from 'react-redux';

import i18n from '../../i18n';
import * as selectors from '../selectors';
import { actions } from '../slices';

const steps: Step[] = [
  {
    skipBeacon: true,
    overlayClickAction: false,
    blockTargetInteraction: true,
    title: i18n.t('Game page'),
    content: i18n.t(
      'This is a game page. You need to solve the task first and pass all tests successfully.',
    ),
    locale: {
      skip: i18n.t('Skip guide'),
    },
    placement: 'center',
    target: 'body',
  },
  {
    overlayClickAction: false,
    blockTargetInteraction: true,
    target: '[data-guide-id="Task"]',
    title: i18n.t('Task'),
    content: i18n.t('Read the task carefully, pay attention to examples'),
    locale: {
      skip: i18n.t('Skip guide'),
    },
  },
  {
    overlayClickAction: false,
    target: '[data-guide-id="LeftEditor"] .guide-LanguagePicker',
    placement: 'top',
    title: i18n.t('Language'),
    content: i18n.t('Choose the programming language that you like best'),
    locale: {
      skip: i18n.t('Skip guide'),
    },
  },
  {
    overlayClickAction: false,
    blockTargetInteraction: true,
    target: '[data-guide-id="LeftEditor"] .react-monaco-editor-container',
    title: i18n.t('Editor'),
    content: i18n.t('Write the solution of task in the editor'),
    locale: {
      skip: i18n.t('Skip guide'),
    },
  },
  {
    overlayClickAction: false,
    zIndex: 10000,
    target: '[data-guide-id="LeftEditor"] [data-guide-id="GiveUpButton"]',
    title: i18n.t('Give up button'),
    content: i18n.t(
      'Click this button to give up. You will lose the game and can try it again next time, or ask your opponent for an immediate rematch.',
    ),
    locale: {
      skip: i18n.t('Skip guide'),
    },
  },
  {
    overlayClickAction: false,
    zIndex: 10000,
    target: '[data-guide-id="LeftEditor"] [data-guide-id="ResetButton"]',
    title: i18n.t('Reset button'),
    content: i18n.t('Click this button to reset the code to the original template'),
    locale: {
      skip: i18n.t('Skip guide'),
    },
  },
  {
    overlayClickAction: false,
    zIndex: 10000,
    target: '[data-guide-id="LeftEditor"] [data-guide-id="CheckResultButton"]',
    title: i18n.t('Check button'),
    content: i18n.t('Click the button to check your solution or use Ctrl+Enter/Cmd+Enter'),
    locale: {
      skip: i18n.t('Skip guide'),
    },
  },
  {
    overlayClickAction: false,
    blockTargetInteraction: true,
    target: '#leftOutput-tab',
    title: i18n.t('Result output'),
    content: i18n.t(
      'Here you will see the test results or compilation errors after checking your solution',
    ),
    locale: {
      skip: i18n.t('Skip guide'),
    },
  },
];

interface GameWidgetGuideProps {
  tournamentId?: number | string;
}

function GameWidgetGuide({ tournamentId }: GameWidgetGuideProps) {
  const dispatch = useDispatch();

  const [isFirstTime, setIsFirstTime] = useState(
    window.localStorage.getItem('guideGamePassed') === null,
  );

  const isShowGuide = useSelector(selectors.isShowGuideSelector);

  return (
    (isShowGuide || isFirstTime) &&
    !tournamentId && (
      <Joyride
        continuous
        run
        scrollToFirstStep
        steps={steps}
        options={{
          primaryColor: '#0275d8',
          zIndex: 1000,
          showProgress: true,
          spotlightPadding: 6,
          buttons: ['back', 'skip', 'primary'],
        }}
        onEvent={({ status }: EventData) => {
          if (([STATUS.FINISHED, STATUS.SKIPPED] as Status[]).includes(status)) {
            window.localStorage.setItem('guideGamePassed', 'true');
            setIsFirstTime(false);
            dispatch(actions.updateGameUI({ isShowGuide: false }));
          }
        }}
        styles={{
          buttonPrimary: {
            borderRadius: 'unset',
          },
        }}
      />
    )
  );
}

export default memo(GameWidgetGuide);
