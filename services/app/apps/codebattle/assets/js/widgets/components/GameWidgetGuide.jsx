import React, { useState, memo } from 'react';

import ReactJoyride, { STATUS } from 'react-joyride';
import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../selectors';
import { actions } from '../slices';

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

function GameWidgetGuide({ tournamentId }) {
  const dispatch = useDispatch();
  const [isFirstTime, setIsFirstTime] = useState(
    window.localStorage.getItem('guideGamePassed') === null,
  );

  const isShowGuide = useSelector(selectors.isShowGuideSelector);

  return (
    ((isShowGuide || isFirstTime) && !tournamentId) && (
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

export default memo(GameWidgetGuide);
