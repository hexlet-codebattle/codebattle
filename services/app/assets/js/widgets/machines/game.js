import { Machine } from 'xstate';
import Gon from 'gon';
import { Howl } from 'howler';

const soundSettings = Gon.getAsset('current_user').sound_settings;
const soundType = soundSettings.type === 'silent' ? 'standart' : soundSettings.type;
const soundLevel = soundSettings.level * 0.1;
const pathDirectory = `/assets/audio/${soundType}`;

export default Machine({
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
}, {
  actions: {
    sound_win: () => {
      const sound = new Howl({
        src: [`${pathDirectory}/win.wav`],
        volume: soundLevel,
        onload() {
          return soundSettings.type === 'silent' ? sound.stop() : sound.play();
        },
      });
    },
    sound_give_up: () => {
      const sound = new Howl({
        src: [`${pathDirectory}/give_up.wav`],
        volume: soundLevel,
        onload() {
          return soundSettings.type === 'silent' ? sound.stop() : sound.play();
        },
      });
    },
    sound_time_is_over: () => {
      const sound = new Howl({
        src: [`${pathDirectory}/time_is_over.wav`],
        volume: soundLevel,
        onload() {
          return soundSettings.type === 'silent' ? sound.stop() : sound.play();
        },
      });
    },
    sound_tournament_round_created: () => {
      const sound = new Howl({
        src: [`${pathDirectory}/round_created.wav`],
        volume: soundLevel,
        onload() {
          return soundSettings.type === 'silent' ? sound.stop() : sound.play();
        },
      });
    },
    sound_rematch_update_status: () => {},
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
