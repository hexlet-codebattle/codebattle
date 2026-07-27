import { assign, raise } from 'xstate';

import GameStateCodes from '../config/gameStateCodes';
import tournamentSounds from '../config/tournamentSounds';
import sound from '../lib/sound';

import editor, { config as editorConfig } from './editor';

const initSpectatorEditor = assign(() => ({ editorState: 'spectator' }));

const editorSpectatorMachineStates = {
  ...editor.states,
  loading: {
    on: {
      load_active_editor: { target: 'idle', actions: [initSpectatorEditor] },
    },
  },
};

const states = {
  room: {
    preview: 'preview',

    failure: 'failure',

    active: 'active',
    gameOver: 'game_over',
  },
  network: {
    none: 'none',
    disconnected: 'disconnected',
    disconnectedWithMessage: 'disconnectedWithMessage',
    connected: 'connected',
  },
  editor: {
    loading: 'loading',
    idle: 'idle',
    checking: 'checking',
    banned: 'banned',
  },
};

export const spectatorEditorMachineStates = states.editor;

const machine = {
  id: 'spectator',
  type: 'parallel',
  // xstate v5: seed context (userId/type) from `input`.
  context: ({ input }: any) => ({
    // common context
    errorMessage: null,
    ...(input || {}),
  }),
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
          entry: raise(
            { type: 'SHOW_ERROR_MESSAGE' },
            {
              delay: 2000,
            },
          ),
          on: {
            JOIN: { target: 'connected', actions: ['handleReconnection'] },
            SHOW_ERROR_MESSAGE: {
              target: 'disconnectedWithMessage',
              actions: ['handleDisconnection'],
            },
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
    editor: {
      initial: 'loading',
      states: editorSpectatorMachineStates,
    },
    room: {
      initial: 'preview',
      states: {
        preview: {
          on: {
            LOAD_GAME: [
              { target: 'active', guard: 'isActiveGame' },
              { target: 'game_over', guard: 'isGameOver' },
              { target: 'game_over', guard: 'isTimeout' },
              { target: 'failure' },
            ],

            REJECT_LOADING_GAME: {
              target: 'failure',
              actions: ['handleError', 'throwError'],
            },
          },
        },
        active: {
          on: {
            'user:check_complete': [
              {
                target: 'game_over',
                guard: ({ event }: any) => event.payload.state === 'game_over',
                actions: ['soundWin', 'blockGameRoomAfterCheck'],
              },
              {
                target: 'active',
              },
            ],
            'user:give_up': {
              target: 'game_over',
              actions: ['soundGiveUp'],
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
            'rematch:status_updated': {
              target: 'game_over',
              actions: ['soundRematchUpdateStatus'],
            },
            'tournament:round_created': {
              target: 'game_over',
            },
            'user:check_complete': [
              {
                target: 'game_over',
                guard: ({ event }: any) => event.payload.state === 'game_over',
                actions: ['soundWin', 'blockGameRoomAfterCheck'],
              },
            ],
          },
        },
        failure: {
          type: 'final',
        },
      },
    },
  },
};

export const config = {
  guards: {
    // game guards
    isActiveGame: ({ event }: any) => event.payload.state === GameStateCodes.playing,
    isGameOver: ({ event }: any) => event.payload.state === GameStateCodes.gameOver,
    isTimeout: ({ event }: any) => event.payload.state === GameStateCodes.timeout,

    ...editorConfig.guards,
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
    soundRematchUpdateStatus: () => {},
    blockGameRoomAfterCheck: () => {},

    ...editorConfig.actions,
  },
};

export default machine;
