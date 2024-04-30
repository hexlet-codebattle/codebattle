import { assign, actions } from 'xstate';

import { channelTopics } from '../../socket';
import GameStateCodes from '../config/gameStateCodes';
import speedModes from '../config/speedModes';
import subscriptionTypes from '../config/subscriptionTypes';
import sound from '../lib/sound';

const { send } = actions;

const states = {
  room: {
    preview: 'preview',

    restricted: 'restricted',

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
    loading: 'loading',

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
    subscriptionType: subscriptionTypes.free, // ['free', 'premium', 'admin'],
  },
  states: {
    network: {
      initial: 'none',
      states: {
        none: {
          on: {
            JOIN: { target: 'connected' },
            FAILURE_JOIN: {
              target: 'disconnected',
              actions: ['handleFailureJoin'],
            },
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
            JOIN: {
              target: 'connected',
              actions: ['handleReconnection'],
            },
            SHOW_ERROR_MESSAGE: {
              target: 'disconnectedWithMessage',
              actions: ['handleDisconnection'],
            },
          },
        },
        disconnectedWithMessage: {
          on: {
            JOIN: {
              target: 'connected',
              actions: ['handleReconnection'],
            },
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
              {
                target: 'game_over',
                cond: 'isGameOver',
              },
              {
                target: 'game_over',
                cond: 'isTimeout',
              },
              { target: 'failure', action: 'throwError' },
            ],

            REJECT_LOADING_GAME: {
              target: 'failure',
              actions: ['handleError', 'throwError'],
            },
            START_LOADING_PLAYBOOK: [
              { target: 'restricted', cond: 'haveOnlyFreeAccess' },
              { target: 'stored' },
            ],
          },
        },
        restricted: { type: 'final' },
        waiting: {
          on: {
            'game:user_joined': 'active',
          },
        },
        active: {
          on: {
            [channelTopics.userCheckCompleteTopic]: [
              {
                target: 'game_over',
                cond: (_ctx, { payload }) => payload.state === 'game_over',
                // TODO: figureOut why soundWin doesn't work
                actions: ['soundWin', 'blockGameRoomAfterCheck', 'showGameResultModal'],
              },
              {
                target: 'active',
                actions: ['blockGameRoomAfterCheck'],
              },
            ],
            [channelTopics.userGiveUpTopic]: {
              target: 'game_over',
              actions: ['soundGiveUp', 'showGameResultModal'],
            },
            [channelTopics.gameTimeoutTopic]: {
              target: 'game_over',
              actions: ['soundTimeIsOver'],
            },
            [channelTopics.tournamentGameCreatedTopic]: {
              target: 'active',
              actions: ['soundTournamentGameCreated'],
            },
            [channelTopics.tournamentRoundFinishedTopic]: {
              target: 'game_over',
            },
            check_result: {
              target: 'active',
              actions: ['soundStartChecking'],
            },
          },
        },
        game_over: {
          on: {
            [channelTopics.rematchStatusUpdatedTopic]: {
              target: 'game_over',
              actions: ['soundRematchUpdateStatus'],
            },
            [channelTopics.tournamentGameCreatedTopic]: {
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
                OPEN_TESTING: [
                  {
                    target: 'idle',
                    cond: 'haveOnlyFreeAccess',
                    actions: ['showPremiumSubscribeRequestModal'],
                  },
                  { target: 'testing' },
                ],
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
            START_LOADING_PLAYBOOK: [
              {
                target: 'empty',
                cond: 'haveOnlyFreeAccess',
                actions: ['showPremiumSubscribeRequestModal'],
              },
              { target: 'loading' },
            ],
          },
        },
        loading: {
          on: {
            LOAD_PLAYBOOK: [
              {
                target: 'empty',
                cond: 'haveOnlyFreeAccess',
                actions: ['showPremiumSubscribeRequestModal'],
              },
              { target: 'on' },
            ],
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
              actions: ['toggleSpeedMode'],
            },
          },
          ...recordMachine,
        },
        off: {
          on: {
            OPEN_REPLAYER: [
              {
                target: 'off',
                cond: 'haveOnlyFreeAccess',
                actions: ['showPremiumSubscribeRequestModal'],
              },
              { target: 'on' },
            ],
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
    haveOnlyFreeAccess: ctx => ctx.subscriptionType === 'free',
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
    blockGameRoomAfterCheck: () => { },

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
    showPremiumSubscribeRequestModal: () => { },
  },
};

export default machine;
