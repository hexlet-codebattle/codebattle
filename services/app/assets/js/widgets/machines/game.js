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
    start_checking: sendEditor('check_solution'),
    stop_checking: sendEditor('receive_check_result'),

    sound_win: (ctx, event) => console.log('sound_win', ctx, event),
    sound_give_up: (ctx, event) => console.log('sound_give_up', ctx, event),
    sound_time_is_over: (ctx, event) => console.log('sound_time_is_over', ctx, event),
    sound_tournament_round_created: (ctx, event) => console.log('sound_tournament_round_created', ctx, event),
    sound_rematch_update_status: (ctx, event) => console.log('sound_rematch_update_status', ctx, event),
    initEditor:
      assign((ctx, { config, context, name }) => ({
        ...ctx,
        [name]: spawn(
          editorMachine.withConfig(config).withContext(context),
          { name },
        ),
      })),
    proceed_typing: sendEditor('typing'),
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
