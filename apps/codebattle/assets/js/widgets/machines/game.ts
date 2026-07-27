import { assign, raise } from 'xstate';

import { channelTopics } from '../../socket';
import GameStateCodes from '../config/gameStateCodes';
import speedModes from '../config/speedModes';
import subscriptionTypes from '../config/subscriptionTypes';
import tournamentSounds from '../config/tournamentSounds';
import sound from '../lib/sound';

const states = {
  room: {
    preview: 'preview',

    restricted: 'restricted',

    failure: 'failure',

    waiting: 'waiting',
    active: 'active',
    gameOver: 'game_over',

    stored: 'stored',
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
  // xstate v5: initial context is derived from `input` so callers can seed it
  // (e.g. subscriptionType from redux) via `useActorRef(machine, { input })`.
  context: ({ input }: any) => ({
    // common context
    errorMessage: null,
    // context for replayer
    holding: 'none', // ['none', 'play', 'pause']
    speedMode: speedModes.normal,
    subscriptionType: subscriptionTypes.free, // ['free', 'premium', 'admin'],
    ...(input || {}),
  }),
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
          entry: raise(
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
              { target: 'waiting', guard: 'isWaitingGame' },
              { target: 'active', guard: 'isActiveGame' },
              {
                target: 'game_over',
                guard: 'isGameOver',
              },
              {
                target: 'game_over',
                guard: 'isTimeout',
              },
              { target: 'failure' },
            ],

            REJECT_LOADING_GAME: {
              target: 'failure',
              actions: ['handleError', 'throwError'],
            },
            START_LOADING_PLAYBOOK: [
              { target: 'restricted', guard: 'haveOnlyFreeAccess' },
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
                guard: ({ event }: any) => event.payload.state === 'game_over',
                // TODO: figureOut why soundWin doesn't work
                actions: ['soundWin', 'blockGameRoomAfterCheck', 'showGameResultModal'],
              },
              {
                target: 'active',
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
                guard: 'haveOnlyFreeAccess',
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
                guard: 'haveOnlyFreeAccess',
                actions: ['showPremiumSubscribeRequestModal'],
              },
              {
                target: 'on',
                actions: ['handleOpenHistory'],
              },
            ],
            REJECT_LOADING_PLAYBOOK: {
              target: 'failure',
              actions: ['handleError', 'throwError'],
            },
          },
        },
        on: {
          on: {
            CLOSE_REPLAYER: {
              target: 'off',
              actions: ['handleOpenActiveGame'],
            },
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
                guard: 'haveOnlyFreeAccess',
                actions: ['showPremiumSubscribeRequestModal'],
              },
              {
                target: 'on',
                actions: ['handleOpenHistory'],
              },
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
    isWaitingGame: ({ event }: any) => event.payload.state === GameStateCodes.waitingOpponent,
    isActiveGame: ({ event }: any) => event.payload.state === GameStateCodes.playing,
    haveOnlyFreeAccess: ({ context }: any) => context.subscriptionType === 'free',
    isGameOver: ({ event }: any) => event.payload.state === GameStateCodes.gameOver,
    isTimeout: ({ event }: any) => event.payload.state === GameStateCodes.timeout,
  },
  actions: {
    // common actions
    handleError: assign({
      errorMessage: ({ event }: any) => event.payload.message,
    }),
    throwError: ({ event }: any) => {
      throw new Error(`Unexpected behavior (payload: ${JSON.stringify(event.payload)})`);
    },
    // network actions
    handleFailureJoin: () => {},
    handleDisconnection: () => {},
    handleReconnection: () => {},

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
    soundTournamentRoundCreated: ({ event }: any) => {
      if (event.payload?.tournament?.currentRoundPosition === 0) {
        sound.playTournamentAsset(tournamentSounds.started);
      } else {
        sound.playTournamentAsset(tournamentSounds.roundStarted);
      }
    },
    // referenced by the `active`/`game_over` states but historically never
    // implemented (was a silent no-op under v4); keep it a no-op so v5 doesn't
    // throw on an unresolved action reference.
    soundTournamentGameCreated: () => {},
    soundRematchUpdateStatus: () => {},
    blockGameRoomAfterCheck: () => {},
    handleOpenHistory: () => {},
    handleOpenActiveGame: () => {},

    // replayer actions
    toggleSpeedMode: assign({
      speedMode: ({ context }: any) => {
        switch (context.speedMode) {
          case speedModes.normal:
            return speedModes.fast;
          case speedModes.fast:
            return speedModes.faster;
          case speedModes.faster:
            return speedModes.normal;
          default:
            throw new Error('Unexpected speedMode [replayer machine]');
        }
      },
    }),
    showPremiumSubscribeRequestModal: () => {},
  },
};

export default machine;
