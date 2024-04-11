import { assign } from 'xstate';

const states = {
  room: {
    none: 'none',
    active: 'active',
    inactive: 'inactive',
  },
  player: {
    ready: 'ready',
    baned: 'baned',
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
    waitingPlayers: [],
    pausedPlayers: [],
    finishedPlayers: [],
    banedPlayers: [],
    errorMessage: null,
  },
  states: {
    status: {
      initial: 'none',
      on: {
        'waiting_room:started': 'active',
      },
      states: {
        none: {
          on: {
            LOAD_WAITING_ROOM: 'active',
            REJECT_LOADING: 'inactive',
            FAILED_LOADING: {
              target: 'failure',
              actions: ['handleError', 'throwError'],
            },
          },
        },
        active: {
          entry: ['loadWaitingRoom'],
          on: {
            'waiting_room:ended': 'inactive',
            'waiting_room:player:matchmaking_started': {
              actions: 'addWaitingPlayer',
            },
            'waiting_room:player:matchmaking_paused': {
              actions: 'addPausedPlayer',
            },
            'waiting_room:player:match_created': {
              actions: 'removeWaitingPlayer',
            },
            'waiting_room:player:banned': {
              actions: 'addBannedPlayer',
            },
            'waiting_room:player:unbanned': {
              actions: 'removeBannedPlayer',
            },
            'waiting_room:player:finished': {
              actions: 'addFinishedPlayer',
            },
          },
          exit: ['unloadWaitingRoom'],
        },
        inactive: {},
        failure: {},
      },
    },
    player: {
      initial: 'ready',
      states: {
        ready: {
          on: {
            'waiting_room:player:baned': 'baned',
            'waiting_room:player:matchmaking_started': 'matchmaking',
            'waiting_room:started': [
              { target: 'matchmaking.paused', cond: 'isMatchmakingPaused' },
              { target: 'matchmaking' },
            ],
          },
        },
        matchmaking: {
          initial: 'progress',
          on: {
            'waiting_room:player:baned': 'baned',
            'waiting_room:player:matchmaking_stoped': 'ready',
          },
          states: {
            progress: {
              on: {
                'waiting_room:player:matchmaking_paused': 'paused',
                'waiting_room:player:match_created': 'success',
              },
            },
            success: {},
            paused: {
              on: {
                'waiting_room:player:matchmaking_restarted': 'progress',
              },
            },
          },
        },
        baned: {
          on: {
            'waiting_room:player:unbaned': [
              { target: 'matchmaking', cond: 'isMatchmakingInProgress' },
              { target: 'ready' },
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
      waitingPlayers: (_ctx, { payload }) => payload?.waitingPlayers || [],
      pausedPlayers: (_ctx, { payload }) => payload?.pausedPlayers || [],
      finishedPlayers: (_ctx, { payload }) => payload?.finishedPlayers || [],
      banedPlayers: (_ctx, { payload }) => payload?.banedPlayers || [],
    }),
    unloadWaitingRoom: assign({
      errorMessage: null,
      waitingPlayers: [],
      pausedPlayers: [],
      finishedPlayers: [],
      banedPlayers: [],
    }),
    addWaitingPlayer: assign({
      waitingPlayers: (ctx, { payload }) => (
        payload.playerId
          ? ctx.waitingPlayers.push(payload?.playerId)
          : ctx.waitingPlayers
      ),
      pausedPlayers: (ctx, { payload }) => (
        ctx.pausedPlayers.filter(payload.playerId)
      ),
      finishedPlayers: (ctx, { payload }) => (
        ctx.finishedPlayers.filter(payload.playerId)
      ),
    }),
    addPausedPlayer: assign({
      waitingPlayers: (ctx, { payload }) => (
        ctx.waitingPlayers.filter(payload.playerId)
      ),
      pausedPlayers: (ctx, { payload }) => (
        payload.playerId
          ? ctx.pausedPlayers.push(payload?.playerId)
          : ctx.pausedPlayers
      ),
    }),
    removeWaitingPlayer: assign({
      waitingPlayers: (ctx, { payload }) => (
        ctx.waitingPlayers.filter(payload.playerId)
      ),
    }),
    addBannedPlayer: assign({
      waitingPlayers: (ctx, { payload }) => (
        ctx.waitingPlayers.filter(payload.playerId)
      ),
      pausedPlayers: (ctx, { payload }) => (
        ctx.pausedPlayers.filter(payload.playerId)
      ),
    }),
    handleError: assign({
      errorMessage: (_ctx, { payload }) => payload.message,
    }),
  },
};

export const waitingRoomMachineStates = states;

export default machine;
