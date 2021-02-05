import {
  Machine,
  spawn,
  assign,
  send,
} from 'xstate';

import editorMachine from './editor';

const sendEditor = type => send(type, {
  to: (_ctx, { target }) => target,
});

export default Machine({
  id: 'game',
  initial: 'preview',
  context: {
    // editor-{id}
  },
  on: {
    initEditorActor: {
      actions: ['initEditor'],
    },
    typing: {
      actions: ['proceed_typing'],
    },
  },
  states: {
    preview: {
      on: {
        load_active_game: 'active',
        load_finished_game: 'game_over',
      },
    },
    active: {
      on: {
        'editor:data': {
          actions: ['sound_user_typing', 'proceed_typing'],
        },
        'user:start_check': {
          actions: ['start_checking'],
        },
        'user:check_complete': {
          actions: ['stop_checking'],
        },
        'chat:user_joined': {
          target: 'active',
        },
        'user:won': {
          target: 'game_over',
          actions: ['sound_win'],
        },
        'user:give_up': {
          target: 'game_over',
          actions: ['sound_give_up'],
        },
        'game:timeout': {
          target: 'game_over',
          actions: ['sound_time_is_over'],
        },
        'tournament:round_created': {
          target: 'active',
          actions: ['sound_tournament_round_created'],
        },
      },
    },
    game_over: {
      on: {
        'editor:data': {
          actions: ['sound_user_typing', 'proceed_typing'],
        },
        'user:start_check': {
          actions: ['start_checking'],
        },
        'user:check_complete': {
          actions: ['stop_checking'],
        },
        'rematch:update_status': {
          target: 'game_over',
          actions: ['sound_rematch_update_status'],
        },
        'tournament:round_created': {
          target: 'game_over',
        },
      },
    },
  },
}, {
  actions: {
    sound_user_typing: (ctx, event) => console.log('sound_user_typing', ctx, event),
    sound_checking: (ctx, event) => console.log('sound_checking', ctx, event),
    start_checking: (ctx, event) => console.log('start_checking', ctx, event),
    stop_checking: (ctx, event) => console.log('stop_checking', ctx, event),
    sound_complete: (ctx, event) => console.log('sound_complete', ctx, event),
    sound_win: (ctx, event) => console.log('sound_win', ctx, event),
    notify: (ctx, event) => {
      console.log('notify', ctx, event);
      showCheckingStatusMessage(event);
    },
    notify_checking_result: (ctx, event) => {
      console.log('notify_checking_result', ctx, event);
      showCheckingStatusMessage(event);
    },
    sound_give_up: (ctx, event) => console.log('sound_give_up', ctx, event),
    sound_time_is_over: (ctx, event) => console.log('sound_time_is_over', ctx, event),
    sound_tournament_round_created: (ctx, event) => console.log('sound_tournament_round_created', ctx, event),
    sound_rematch_update_status: (ctx, event) => console.log('sound_rematch_update_status', ctx, event),
  },
});

// export default Machine({
//   id: "game",
//   initial: "idle",
//   states: {
//     idle: {
//       entry: (ctx, event) => {},
//       exit: (ctx, event) => {},
//       on: {
//         START: {
//           target: "started",
//           actions: [],
//           cond: (ctx, event) => true,
//         },
//       },
//     },
//     started: {},
//   },
// }, {
//   services: {
//     give_up: () => {},
//   },
//   guards: {
//     messageValid: () => true,
//   },
//   actions: {
//     action: () => {},
//   },
// })
