import { assign, actions } from 'xstate';

import GameStateCodes from '../config/gameStateCodes';
import sound from '../lib/sound';

import editor, { config as editorConfig } from './editor';

const { send } = actions;

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
  context: {
    // common context
    errorMessage: null,
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
              { target: 'active', cond: 'isActiveGame' },
              { target: 'game_over', cond: 'isGameOver' },
              { target: 'game_over', cond: 'isTimeout' },
              { target: 'failure', action: 'throwError' },
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
                cond: (_ctx, { payload }) => payload.state === 'game_over',
                actions: ['soundWin', 'blockGameRoomAfterCheck'],
              },
              {
                target: 'active',
                actions: ['blockGameRoomAfterCheck'],
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
    isActiveGame: (_ctx, { payload }) => payload.state === GameStateCodes.playing,
    isGameOver: (_ctx, { payload }) => payload.state === GameStateCodes.gameOver,
    isTimeout: (_ctx, { payload }) => payload.state === GameStateCodes.timeout,

    ...editorConfig.guards,
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

    ...editorConfig.actions,
  },
};

export default machine;
