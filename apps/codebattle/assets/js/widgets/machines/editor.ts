import { assign } from 'xstate';

import { editorBtnStatuses, editorSettingsByUserType } from '../config/editorSettingsByUserType';
import editorUserTypes from '../config/editorUserTypes';
import SubscriptionTypeCodes from '../config/subscriptionTypes';
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
  charging: {
    checkBtnStatus: editorBtnStatuses.charging,
  },
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

// const initContextByState = state => assign(({ context }) => ({ ...settingsByState[state], userId: context.userId }));
const initContextByState = (state: keyof typeof settingsByState) =>
  assign(({ context }: any) => ({
    ...editorSettingsByUserType[context.type as keyof typeof editorSettingsByUserType],
    ...settingsByState[state],
    userId: context.userId,
  }));

const initActiveEditor = assign(() => ({ editorState: 'active' }));
const initTestingEditor = assign(() => ({ editorState: 'testing' }));
const initBannedEditor = assign(() => ({ editorState: 'banned' }));

const timeoutCheckingActions = [
  'soundFailureChecking',
  'handleTimeoutFailureChecking',
  'openCheckResultOutput',
];
const successCheckingActions = ['soundFinishedChecking', 'openCheckResultOutput'];

const editor = {
  initial: 'loading',
  // xstate v5: seed context (userId/type/subscriptionType) from `input`.
  context: ({ input }: any) => ({ ...(input || {}) }),
  states: {
    loading: {
      on: {
        load_active_editor: [
          {
            target: 'idle',
            guard: 'canSkipCharging',
            actions: [initActiveEditor],
          },
          {
            target: 'charging',
            actions: [initActiveEditor],
          },
        ],
        load_testing_editor: { target: 'idle', actions: [initTestingEditor] },
        load_banned_editor: { target: 'banned', actions: [initBannedEditor] },
        load_stored_editor: 'history',
      },
    },
    history: {
      type: 'final',
      entry: initContextByState('history'),
    },
    charging: {
      after: {
        3000: {
          target: 'idle',
        },
      },
      entry: initContextByState('charging'),
      on: {
        check_solution_received: {
          target: 'checking',
          actions: ['soundStartChecking'],
          guard: 'isUserEvent',
        },
        unload_editor: 'loading',
        banned_user: {
          target: 'banned',
          guard: 'isUserEvent',
        },
      },
    },
    idle: {
      entry: initContextByState('idle'),
      on: {
        user_check_solution: {
          target: 'checking',
          actions: ['soundStartChecking', 'userSendSolution'],
        },
        check_solution_received: {
          target: 'checking',
          actions: ['soundStartChecking'],
          guard: 'isUserEvent',
        },
        unload_editor: 'loading',
        banned_user: {
          target: 'banned',
          guard: 'isUserEvent',
        },
      },
    },
    checking: {
      entry: initContextByState('checking'),
      after: {
        50000: [
          {
            target: 'idle',
            guard: 'canSkipCharging',
            actions: timeoutCheckingActions,
          },
          {
            target: 'charging',
            actions: timeoutCheckingActions,
          },
        ],
      },
      on: {
        receive_check_result: [
          {
            target: 'idle',
            actions: successCheckingActions,
            guard: 'isUserEventWhoCanSkipCharging',
          },
          {
            target: 'charging',
            actions: successCheckingActions,
            guard: 'isUserEvent',
          },
        ],
        unload_editor: 'loading',
        banned_user: {
          target: 'banned',
          guard: 'isUserEvent',
        },
      },
    },
    banned: {
      entry: initContextByState('banned'),
      on: {
        unbanned_user: {
          target: 'idle',
          guard: 'isUserEvent',
        },
      },
    },
  },
};

const canSkipCharging = (type: string) => type !== SubscriptionTypeCodes.free;

export const config = {
  actions: {
    userSendSolution: () => {},
    handleTimeoutFailureChecking: () => {},
    openCheckResultOutput: ({ context }: any) => {
      const leftOutputNode = document.getElementById('leftOutput-tab');
      if (context.type === editorUserTypes.currentUser && leftOutputNode) {
        leftOutputNode.click();
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
    isUserEvent: ({ context, event }: any) => context.userId === event.userId,
    isUserEventWhoCanSkipCharging: ({ context, event }: any) =>
      context.userId === event.userId && canSkipCharging(context.subscriptionType),
    canSkipCharging: ({ context }: any) => canSkipCharging(context.subscriptionType),
  },
};

export default editor;
