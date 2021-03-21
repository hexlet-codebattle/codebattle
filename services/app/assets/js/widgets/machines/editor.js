import { Machine, assign } from 'xstate';
import sound from '../lib/sound';
import editorUserTypes from '../config/editorUserTypes';

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
  typing: {},
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

const initContextByState = state => assign(({ userId }) => ({ ...settingsByState[state], userId }));

export default Machine(
  {
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
          typing: {
            target: 'typing',
            actions: ['soundStartTyping'],
            cond: 'isUserEvent',
          },
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
      typing: {
        entry: initContextByState('typing'),
        after: {
          1000: {
            target: 'idle',
            actions: ['soundEndTyping'],
          },
        },
        on: {
          typing: {
            target: 'typing',
            cond: 'isUserEvent',
          },
          check_solution: {
            target: 'checking',
            actions: ['soundEndTyping', 'soundStartChecking'],
            cond: 'isUserEvent',
          },
        },
      },
      checking: {
        entry: initContextByState('checking'),
        after: {
          30000: {
            target: 'idle',
            actions: ['soundFailureChecking'],
          },
        },
        on: {
          receive_check_result: {
            target: 'idle',
            actions: ['soundFinishedChecking'],
            cond: 'isUserEvent',
          },
        },
        baned: {},
      },
    },
  },
  {
    actions: {
      userStartChecking: () => {},
      soundStartChecking: () => {
        sound.play('check');
      },
      soundFailureChecking: () => {
        sound.play('failure');
      },
      soundFinishedChecking: () => {
        sound.stop();
      },
      soundStartTyping: () => {},
      soundEndTyping: () => {},
    },
    guards: {
      isUserEvent: (ctx, { userId }) => ctx.userId === userId,
    },
  },
);
