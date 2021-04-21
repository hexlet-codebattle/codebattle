import { Machine, assign } from 'xstate';
import speedModes from '../config/speedModes';
import sound from '../lib/sound';

const recordMachine = {
  initial: 'ended',
  states: {
    paused: {
      on: {
        PLAY: 'playing',
        END: 'ended',
        HOLD: {
          target: 'holded',
          actions: assign({
            holding: 'pause',
          }),
        },
      },
    },
    playing: {
      on: {
        PAUSE: 'paused',
        END: 'ended',
        HOLD: {
          target: 'holded',
          actions: assign({
            holding: 'play',
          }),
        },
      },
    },
    holded: {
      on: {
        RELEASE_AND_PLAY: {
          target: 'playing',
          actions: assign({
            holding: 'none',
          }),
        },
        RELEASE_AND_PAUSE: {
          target: 'paused',
          actions: assign({
            holding: 'none',
          }),
        },
      },
    },
    ended: {
      on: {
        PLAY: 'playing',
        HOLD: {
          target: 'holded',
          actions: assign({
            holding: 'pause',
          }),
        },
      },
    },
  },
};

const machine = Machine(
  {
    id: 'main',
    type: 'parallel',
    context: {
      // common context
      errorMessage: null,
      // context for replayer
      holding: 'none', // ['none', 'play', 'pause']
      speedMode: speedModes.normal,
    },
    states: {
      game: {
        initial: 'preview',
        states: {
          preview: {
            on: {
              LOAD_WAITING_GAME: 'waiting',
              LOAD_ACTIVE_GAME: 'active',
              LOAD_FINISHED_GAME: 'game_over',
              REJECT_LOADING_GAME: {
                target: 'failure',
                actions: ['handleError', 'throwError'],
              },
              LOAD_PLAYBOOK: 'stored',
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
                actions: ['showGameResultModal'],
              },
              'user:won': {
                target: 'game_over',
                actions: ['soundWin'],
              },
              'user:give_up': {
                target: 'game_over',
                actions: ['soundGiveUp', 'showGameResultModal'],
              },
              'game:timeout': {
                target: 'game_over',
                actions: ['soundTimeIsOver'],
              },
              'tournament:round_created': {
                target: 'active',
                actions: ['soundTournamentRoundCreated'],
              },
              check_result: {
                target: 'active',
                actions: ['soundStartChecking'],
              },
            },
          },
          game_over: {
            on: {
              'rematch:update_status': {
                target: 'game_over',
                actions: ['soundRematchUpdateStatus'],
              },
              'tournament:round_created': {
                target: 'game_over',
              },
            },
          },
          stored: {
            type: 'final',
          },
          failure: {
            type: 'final',
          },
        },
      },
      replayer: {
        initial: 'empty',
        states: {
          empty: {
            on: {
              LOAD_PLAYBOOK: 'on',
              REJECT_LOADING_PLAYBOOK: {
                target: 'failure',
                actions: ['handleError', 'throwError'],
              },
            },
          },
          on: {
            on: {
              CLOSE_REPLAYER: 'off',
              TOGGLE_SPEED_MODE: {
                actions: 'toggleSpeedMode',
              },
            },
            ...recordMachine,
          },
          off: {
            on: {
              OPEN_REPLAYER: 'on',
            },
          },
          failure: {
            type: 'final',
          },
        },
        stored: {},
      },
    },
  },
  {
    actions: {
      // common actions
      handleError: assign({
        errorMessage: (_ctx, { payload }) => payload.message,
      }),
      throwError: (_ctx, { payload }) => {
        throw payload;
      },

      // game actions
      soundWin: () => {
        sound.play('win');
      },
      soundGiveUp: () => {
        sound.play('give_up');
      },
      soundTimeIsOver: () => {
        sound.play('time_is_over');
      },
      soundTournamentRoundCreated: () => {
        sound.play('round_created');
      },
      soundRematchUpdateStatus: () => {},

      // replayer actions
      toggleSpeedMode: assign({
        speedMode: ({ speedMode }) => {
          switch (speedMode) {
            case speedModes.normal:
              return speedModes.fast;
            case speedModes.fast:
              return speedModes.normal;
            default:
              throw new Error('Unexpected speedMode [replayer machine]');
          }
        },
      }),
    },
  },
);

const states = {
  game: {
    preview: 'preview',
    failure: 'failure',
    waiting: 'waiting',
    active: 'active',
    game_over: 'game_over',
    stored: 'stored',
  },
  replayer: {
    empty: 'empty',
    failure: 'failure',
    on: 'on',
    paused: 'on.paused',
    playing: 'on.playing',
    holded: 'on.holded',
    ended: 'on.ended',
    off: 'off',
  },
};

export const gameMachineStates = states.game;
export const replayerMachineStates = states.replayer;

export default machine;
