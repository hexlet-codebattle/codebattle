import { assign } from 'xstate';

import { channelTopics } from '../../socket';

const states = {
  room: {
    none: 'none',
    active: 'active',
    inactive: 'inactive',
  },
  player: {
    idle: 'idle',
    banned: 'banned',
    matchmaking: 'matchmaking',
  },
  matchmaking: {
    progress: 'matchmaking.progress',
    success: 'matchmaking.success',
    paused: 'matchmaking.paused',
  },
};

const machine = {
  id: 'waitingRoom',
  type: 'parallel',
  initial: 'none',
  context: {
    errorMessage: null,
  },
  states: {
    status: {
      initial: 'none',
      // on: {
      // },
      states: {
        none: {
          on: {
            LOAD_WAITING_ROOM: 'active',
            REJECT_LOADING: 'inactive',
            FAILED_LOADING: {
              target: 'failure',
              actions: ['handleError', 'throwError'],
            },
           [channelTopics.waitingRoomStartedTopic]: 'active',
          },
        },
        active: {
          entry: ['loadWaitingRoom'],
          on: {
            [channelTopics.waitingRoomEndedTopic]: 'inactive',
          },
          exit: ['unloadWaitingRoom'],
        },
        inactive: {
          on: {
            [channelTopics.waitingRoomStartedTopic]: 'active',
          },
        },
        failure: {
          on: {
            [channelTopics.waitingRoomStartedTopic]: 'active',
          },
        },
      },
    },
    player: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            [channelTopics.waitingRoomPlayerBannedTopic]: 'banned',
            [channelTopics.waitingRoomPlayerMatchmakingStartedTopic]: 'matchmaking',
            [channelTopics.waitingRoomStartedTopic]: [
              { target: 'matchmaking.paused', cond: 'isMatchmakingPaused' },
              { target: 'matchmaking' },
            ],
          },
        },
        matchmaking: {
          initial: 'progress',
          on: {
            [channelTopics.waitingRoomPlayerBannedTopic]: 'banned',
            [channelTopics.waitingRoomPlayerMatchmakingStopedTopic]: 'idle',
          },
          states: {
            progress: {
              on: {
                [channelTopics.waitingRoomPlayerMatchmakingPausedTopic]: 'paused',
                'waiting_room:player:match_created': 'success',
              },
            },
            success: {},
            paused: {
              on: {
                [channelTopics.waitingRoomPlayerMatchmakingResumedTopic]: 'progress',
              },
            },
          },
        },
        banned: {
          on: {
            [channelTopics.waitingRoomPlayerUnbannedTopic]: [
              { target: 'matchmaking', cond: 'isMatchmakingInProgress' },
              { target: 'idle' },
            ],
          },
        },
      },
    },
  },
};

export const config = {
  guards: {
    isMatchmakingInProgress: (_ctx, { payload }) => !!payload.isWait,
    isMatchmakingPaused: (_ctx, { payload }) => !!payload.isPaused,
  },
  actions: {
    loadWaitingRoom: assign({
      errorMessage: null,
    }),
    unloadWaitingRoom: assign({
      errorMessage: null,
    }),
    // addWaitingPlayer: assign({
    //   waitingPlayers: (ctx, { payload }) => (
    //     payload.playerId
    //       ? ctx.waitingPlayers.push(payload?.playerId)
    //       : ctx.waitingPlayers
    //   ),
    //   pausedPlayers: (ctx, { payload }) => (
    //     ctx.pausedPlayers.filter(payload.playerId)
    //   ),
    //   finishedPlayers: (ctx, { payload }) => (
    //     ctx.finishedPlayers.filter(payload.playerId)
    //   ),
    // }),
    // addPausedPlayer: assign({
    //   waitingPlayers: (ctx, { payload }) => (
    //     ctx.waitingPlayers.filter(payload.playerId)
    //   ),
    //   pausedPlayers: (ctx, { payload }) => (
    //     payload.playerId
    //       ? ctx.pausedPlayers.push(payload?.playerId)
    //       : ctx.pausedPlayers
    //   ),
    // }),
    // removeWaitingPlayer: assign({
    //   waitingPlayers: (ctx, { payload }) => (
    //     ctx.waitingPlayers.filter(payload.playerId)
    //   ),
    // }),
    // addBannedPlayer: assign({
    //   waitingPlayers: (ctx, { payload }) => (
    //     ctx.waitingPlayers.filter(payload.playerId)
    //   ),
    //   pausedPlayers: (ctx, { payload }) => (
    //     ctx.pausedPlayers.filter(payload.playerId)
    //   ),
    // }),
    handleError: assign({
      errorMessage: (_ctx, { payload }) => payload.message,
    }),
  },
};

export const waitingRoomMachineStates = states;

export default machine;
