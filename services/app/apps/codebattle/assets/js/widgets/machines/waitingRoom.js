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
            [channelTopics.waitingRoomPlayerMatchmakingStartedTopic]: 'matchmaking.progress',
            [channelTopics.waitingRoomStartedTopic]: [
              { target: 'matchmaking.paused', cond: 'isMatchmakingPaused' },
              { target: 'matchmaking.progress' },
            ],
          },
        },
        matchmaking: {
          initial: 'progress',
          on: {
            [channelTopics.waitingRoomPlayerBannedTopic]: 'banned',
            [channelTopics.waitingRoomPlayerMatchmakingStoppedTopic]: 'idle',
            [channelTopics.waitingRoomEndedTopic]: 'idle',
          },
          states: {
            progress: {
              on: {
                [channelTopics.waitingRoomPlayerMatchmakingPausedTopic]: 'paused',
                [channelTopics.waitingRoomPlayerMatchCreatedTopic]: 'success',
              },
            },
            success: {
              on: {
                [channelTopics.waitingRoomPlayerMatchmakingPausedTopic]: 'paused',
                [channelTopics.waitingRoomStartedTopic]: [
                  { target: 'paused', cond: 'isMatchmakingPaused' },
                  { target: 'progress' },
                ],
              },
            },
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
              { target: 'matchmaking.progress', cond: 'isMatchmakingInProgress' },
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
    isMatchmakingInProgress: (_ctx, { payload }) => payload.currentPlayer.state === 'matchmaking_active',
    isMatchmakingPaused: (_ctx, { payload }) => payload.currentPlayer.state === 'matchmaking_paused',
    isTournamentFinished: (_ctx, { payload }) => payload.currentPlayer.state === 'finished',
    // isRoundFinished: (_ctx, { payload }) => payload.state === 'finished_round',
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
