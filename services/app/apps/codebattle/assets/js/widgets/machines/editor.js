import { assign } from 'xstate';
import sound from '../lib/sound';
import editorUserTypes from '../config/editorUserTypes';
import editorSettingsByUserType from '../config/editorSettingsByUserType';

// settings
// type - user type for viewers current_user/opponent/player (request features) teammate, clanmate, friend
// editable - can be change Editor value true/false
// showControlBtns -  true/false
// checkBtnStatus - 'disabled', 'enabled', 'checking'
// resetBtnStatus - 'disabled', 'enabled'
// giveUpBtnStatus - 'disabled', 'enabled'
// langPickerStatus: 'enabled', 'disabled'
// modeBtnsStatus: 'disabled', 'enabled'

const settingsByState = {
  idle: {},
  checking: {
    editable: false,
    checkBtnStatus: 'checking',
    resetBtnStatus: 'disabled',
    langPickerStatus: 'disabled',
    giveUpBtnStatus: 'disabled',
  },
  banned: {
    editable: false,
    checkBtnStatus: 'disabled',
    resetBtnStatus: 'disabled',
    langPickerStatus: 'disabled',
    giveUpBtnStatus: 'disabled',
    modeBtnsStatus: 'disabled',
  },
  history: {
    type: editorUserTypes.player,
    editable: false,
    showControlBtns: false,
    checkBtnStatus: 'disabled',
    resetBtnStatus: 'disabled',
    langPickerStatus: 'disabled',
    giveUpBtnStatus: 'disabled',
    modeBtnsStatus: 'disabled',
  },
};

// const initContextByState = state => assign(({ userId }) => ({ ...settingsByState[state], userId }));
const initContextByState = state => assign(({ userId, type }) => ({
  ...editorSettingsByUserType[type],
  ...settingsByState[state],
  userId,
}));

const editor = {
  initial: 'loading',
  states: {
    loading: {
      on: {
        load_active_editor: 'idle',
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
          actions: ['soundStartChecking', 'userStartChecking'],
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
        20000: {
          target: 'idle',
          actions: ['soundFailureChecking', 'handleTimeoutFailureChecking'],
        },
      },
      on: {
        receive_check_result: {
          target: 'idle',
          actions: ['soundFinishedChecking'],
          cond: 'isUserEvent',
        },
      },
    },
    baned: {},
  },
};

export const config = {
  actions: {
    userStartChecking: () => {},
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
