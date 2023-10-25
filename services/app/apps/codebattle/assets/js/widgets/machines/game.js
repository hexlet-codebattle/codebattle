import { assign, actions } from 'xstate';

import GameStateCodes from '../config/gameStateCodes';
import speedModes from '../config/speedModes';
import sound from '../lib/sound';

const { send } = actions;

const states = {
  room: {
    preview: 'preview',

    failure: 'failure',

    waiting: 'waiting',
    active: 'active',
    gameOver: 'game_over',

    stored: 'stored',

    builder: 'builder.idle',
    testing: 'builder.testing',
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
  network: {
    none: 'none',
    disconnected: 'disconnected',
    disconnectedWithMessage: 'disconnectedWithMessage',
    connected: 'connected',
  },
};

export const roomMachineStates = states.room;
export const replayerMachineStates = states.replayer;
export const networkMachineStates = states.network;

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

const machine = {
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
    network: {
      initial: 'none',
      states: {
        none: {
          on: {
            JOIN: { target: 'connected' },
            FAILURE_JOIN: { target: 'disconnected', actions: ['handleFailureJoin'] },
            FAILURE: { target: 'disconnected' },
          },
        },
        disconnected: {
          entry: send(
            { type: 'SHOW_ERROR_MESSAGE' },
            {
              delay: 2000,
            },
          ),
          on: {
            JOIN: { target: 'connected', actions: ['handleReconnection'] },
            SHOW_ERROR_MESSAGE: { target: 'disconnectedWithMessage', actions: ['handleDisconnection'] },
          },
        },
        disconnectedWithMessage: {
          on: {
            JOIN: { target: 'connected', actions: ['handleReconnection'] },
          },
        },
        connected: {
          on: {
            FAILURE: { target: 'disconnected' },
          },
        },
      },
    },
    room: {
      initial: 'preview',
      states: {
        preview: {
          on: {
            LOAD_GAME: [
              { target: 'waiting', cond: 'isWaitingGame' },
              { target: 'builder', cond: 'isTaskBuilder' },
              { target: 'active', cond: 'isActiveGame' },
              { target: 'game_over', cond: 'isGameOver' },
              { target: 'game_over', cond: 'isTimeout' },
              { target: 'failure', action: 'throwError' },
            ],

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
              cond: (_ctx, { payload }) => payload.state === 'game_over',
              // TODO: figureOut why soundWin doesn't work
              actions: ['soundWin', 'showGameResultModal'],
            },
            'user:give_up': {
              target: 'game_over',
              actions: ['soundGiveUp', 'showGameResultModal'],
            },
            'game:timeout': {
              target: 'game_over',
              actions: ['soundTimeIsOver'],
            },
            'tournament:game:created': {
              target: 'active',
              actions: ['soundTournamentGameCreated'],
            },
            check_result: {
              target: 'active',
              actions: ['soundStartChecking'],
            },
          },
        },
        game_over: {
          on: {
            'rematch:status_updated': {
              target: 'game_over',
              actions: ['soundRematchUpdateStatus'],
            },
            'tournament:game:created': {
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
        builder: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                OPEN_TESTING: 'testing',
              },
            },
            testing: {
              on: {
                OPEN_TASK_BUILDER: 'idle',
              },
            },
          },
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
};

export const config = {
  guards: {
    // game guards
    isWaitingGame: (_ctx, { payload }) => payload.state === GameStateCodes.waitingOpponent,
    isTaskBuilder: (_ctx, { payload }) => payload.state === GameStateCodes.builder,
    isActiveGame: (_ctx, { payload }) => payload.state === GameStateCodes.playing,
    isGameOver: (_ctx, { payload }) => payload.state === GameStateCodes.gameOver,
    isTimeout: (_ctx, { payload }) => payload.state === GameStateCodes.timeout,
  },
  actions: {
    // common actions
    handleError: assign({
      errorMessage: (_ctx, { payload }) => payload.message,
    }),
    throwError: (_ctx, { payload }) => {
      throw new Error(`Unexpected behavior (payload: ${JSON.stringify(payload)})`);
    },
    // network actions
    handleFailureJoin: () => { },
    handleDisconnection: () => { },
    handleReconnection: () => { },

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
    soundRematchUpdateStatus: () => { },

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
};

export default machine;
