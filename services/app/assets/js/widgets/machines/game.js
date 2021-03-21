import { Machine } from 'xstate';
import sound from '../lib/sound';

export default Machine(
  {
    id: 'game',
    initial: 'preview',
    states: {
      preview: {
        on: {
          load_waiting_game: 'waiting',
          load_active_game: 'active',
          load_finished_game: 'game_over',
          load_stored_game: 'stored',
        },
      },
      waiting: {
        on: {
          'game:user_joined': 'active',
        },
      },
      active: {
        on: {
          'user:check_complete': {
            target: 'game_over',
            cond: (_ctx, { payload }) => payload.status === 'game_over',
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
          'rematch:update_status': {
            target: 'game_over',
            actions: ['sound_rematch_update_status'],
          },
          'tournament:round_created': {
            target: 'game_over',
            actions: ['sound_tournament_round_created'],
          },
        },
      },
      stored: {},
    },
  },
  {
    actions: {
      sound_win: () => {
        sound.play('win');
      },
      sound_give_up: () => {
        sound.play('give_up');
      },
      sound_time_is_over: () => {
        sound.play('time_is_over');
      },
      sound_tournament_round_created: () => {
        sound.play('round_created');
      },
      sound_rematch_update_status: () => {},
    },
  },
);

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
