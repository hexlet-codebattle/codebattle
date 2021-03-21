import { Machine, assign } from "xstate";
import sound from '../lib/sound';

// settings
// type - user type for viewers current_user/opponent/player (request features) teammate, clanmate, friend
// editable - can be change Editor value true/false
// showControlBtns -  true/false
// checkBtnStatus - 'disabled', 'enabled', 'checking'
// resetBtnStatus - 'disabled', 'enabled'
// giveUpBtnStatus - 'disabled', 'enabled'
// langPickerStatus: 'enabled', 'disabled'
// modeBtnsStatus: 'disabled', 'enabled'

const settingsByType = {
  current_user: {
    editable: true,
    showControlBtns: true,
    checkBtnStatus: "enabled",
    resetBtnStatus: "enabled",
    giveUpBtnStatus: "enabled",
    langPickerStatus: "enabled",
    modeBtnsStatus: "enabled",
  },
  opponent: {
    editable: false,
    showControlBtns: false,
    checkBtnStatus: "disabled",
    resetBtnStatus: "disabled",
    langPickerStatus: "disabled",
    giveUpBtnStatus: "disabled",
    modeBtnsStatus: "disabled",
  },
  player: {
    editable: false,
    showControlBtns: false,
    checkBtnStatus: "disabled",
    resetBtnStatus: "disabled",
    langPickerStatus: "disabled",
    giveUpBtnStatus: "disabled",
    modeBtnsStatus: "disabled",
  },
};

const settingsByState = {
  idle: {},
  typing: {},
  checking: {
    editable: false,
    checkBtnStatus: "checking",
    resetBtnStatus: "disabled",
    langPickerStatus: "disabled",
    giveUpBtnStatus: "disabled",
  },
  banned: {
    editable: false,
    checkBtnStatus: "disabled",
    resetBtnStatus: "disabled",
    langPickerStatus: "disabled",
    giveUpBtnStatus: "disabled",
    modeBtnsStatus: "disabled",
  },
  history: {
    type: "player",
    editable: false,
    showControlBtns: false,
    checkBtnStatus: "disabled",
    resetBtnStatus: "disabled",
    langPickerStatus: "disabled",
    giveUpBtnStatus: "disabled",
    modeBtnsStatus: "disabled",
  },
};

const soundSettings = Gon.getAsset("current_user").sound_settings;
const soundType =
  soundSettings.type === "silent" ? "standart" : soundSettings.type;
const soundLevel = soundSettings.level * 0.1;
const pathDirectory = `/assets/audio/${soundType}`;


export const initContext = (ctx) => ({
  ...ctx,
  ...settingsByType[ctx.type],
});

export default Machine(
  {
    initial: "loading",
    states: {
      loading: {
        on: {
          load_active_editor: "idle",
          load_stored_editor: "history",
        },
      },
      history: {
        entry: "init_history_context",
      },
      idle: {
        entry: "init_active_context",
        on: {
          typing: {
            target: "typing",
            actions: ["sound_start_typing"],
            cond: (ctx, event) => ctx.userId === event.userId,
          },
          user_check_solution: {
            target: "checking",
            actions: ["sound_start_checking", "user_start_checking"],
          },
          check_solution: {
            target: "checking",
            actions: ["sound_start_checking"],
            cond: (ctx, event) => ctx.userId === event.userId,
          },
        },
      },
      typing: {
        entry: "assign_typing_context",
        after: {
          1000: {
            target: "idle",
            actions: ["sound_end_typing"],
          },
        },
        on: {
          typing: {
            target: "typing",
            cond: (ctx, event) => ctx.userId === event.userId,
          },
          check_solution: {
            target: "checking",
            actions: ["sound_end_typing", "sound_start_checking"],
            cond: (ctx, event) => ctx.userId === event.userId,
          },
        },
      },
      checking: {
        entry: "assign_checking_context",
        after: {
          30000: {
            target: "idle",
            actions: ["sound_failure_checking"],
          },
        },
        on: {
          receive_check_result: {
            target: "idle",
            actions: ["sound_finished_checking"],
            cond: (ctx, event) => ctx.userId === event.userId,
          },
        },
      },
      baned: {},
    },
  },
  {
    actions: {
      init_active_context: assign((ctx) => ({
        ...ctx,
        ...settingsByType[ctx.type],
      })),
      init_history_context: assign(settingsByState.history),
      assign_typing_context: assign((ctx) => ({
        ...settingsByType[ctx.type],
        ...settingsByState.typing,
      })),
      assign_checking_context: assign((ctx) => ({
        ...settingsByType[ctx.type],
        ...settingsByState.checking,
      })),
      user_start_checking: () => {},
      sound_failure_checking: () => {
        sound.play('failure');
      },
      sound_start_checking: () => {
        sound.play('check');
      },
      sound_finished_checking: () => {
        sound.stop();
      },
      sound_start_typing: () => {},
      sound_end_typing: () => {},
    },
  }
);
