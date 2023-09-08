import { assign } from 'xstate';

import { editorBtnStatuses, editorSettingsByUserType } from '../config/editorSettingsByUserType';
import editorUserTypes from '../config/editorUserTypes';
import sound from '../lib/sound';

// settings
// type - user type for viewers current_user/opponent/player (request features) teammate, clanmate, friend
// editable - can be change Editor value true/false
// showControlBtns -  true/false
// checkBtnStatus - 'disabled', 'enabled', 'checking'
// resetBtnStatus - 'disabled', 'enabled'
// giveUpBtnStatus - 'disabled', 'enabled'
// langPickerStatus: 'disabled', 'enabled'
// modeBtnsStatus: 'disabled', 'enabled'

const settingsByState = {
  idle: {},
  checking: {
    editable: false,
    checkBtnStatus: editorBtnStatuses.checking,
    resetBtnStatus: editorBtnStatuses.disabled,
    langPickerStatus: editorBtnStatuses.disabled,
    giveUpBtnStatus: editorBtnStatuses.disabled,
  },
  banned: {
    editable: false,
    checkBtnStatus: editorBtnStatuses.disabled,
    resetBtnStatus: editorBtnStatuses.disabled,
    langPickerStatus: editorBtnStatuses.disabled,
    giveUpBtnStatus: editorBtnStatuses.disabled,
    modeBtnsStatus: editorBtnStatuses.disabled,
  },
  history: {
    type: editorUserTypes.player,
    editable: false,
    showControlBtns: false,
    checkBtnStatus: editorBtnStatuses.disabled,
    resetBtnStatus: editorBtnStatuses.disabled,
    langPickerStatus: editorBtnStatuses.disabled,
    giveUpBtnStatus: editorBtnStatuses.disabled,
    modeBtnsStatus: editorBtnStatuses.disabled,
  },
};

// const initContextByState = state => assign(({ userId }) => ({ ...settingsByState[state], userId }));
const initContextByState = (state) =>
  assign(({ type, userId }) => ({
    ...editorSettingsByUserType[type],
    ...settingsByState[state],
    userId,
  }));

const initActiveEditor = assign(() => ({ editorState: 'active' }));
const initTestingEditor = assign(() => ({ editorState: 'testing' }));

const editor = {
  initial: 'loading',
  states: {
    loading: {
      on: {
        load_active_editor: { target: 'idle', actions: [initActiveEditor] },
        load_testing_editor: { target: 'idle', actions: [initTestingEditor] },
        load_stored_editor: 'history',
      },
    },
    history: {
      type: 'final',
      entry: initContextByState('history'),
    },
    idle: {
      entry: initContextByState('idle'),
      on: {
        user_check_solution: {
          target: 'checking',
          actions: ['soundStartChecking', 'userSendSolution'],
        },
        check_solution: {
          target: 'checking',
          actions: ['soundStartChecking'],
          cond: 'isUserEvent',
        },
      },
    },
    checking: {
      entry: initContextByState('checking'),
      after: {
        50000: {
          target: 'idle',
          actions: [
            'soundFailureChecking',
            'handleTimeoutFailureChecking',
            'openCheckResultOutput',
          ],
        },
      },
      on: {
        receive_check_result: {
          target: 'idle',
          actions: ['soundFinishedChecking', 'openCheckResultOutput'],
          cond: 'isUserEvent',
        },
      },
    },
    baned: {},
  },
};

export const config = {
  actions: {
    userSendSolution: () => {},
    handleTimeoutFailureChecking: () => {},
    openCheckResultOutput: (ctx) => {
      if (ctx.type === editorUserTypes.currentUser) {
        document.getElementById('leftOutput-tab').click();
      }
    },
    soundStartChecking: () => {
      sound.play('check');
    },
    soundFailureChecking: () => {
      sound.stop();
      sound.play('failure');
    },
    soundFinishedChecking: () => {
      sound.stop();
    },
  },
  guards: {
    isUserEvent: (ctx, { userId }) => ctx.userId === userId,
  },
};

export default editor;
