import { assign } from 'xstate';

import { taskStateCodes } from '../config/task';
import { taskTemplatesStates } from '../utils/builder';

const states = {
  none: 'none',
  idle: 'idle',
  ready: 'ready',
  saved: 'saved',
  failure: 'failure',
  prepareSaving: 'prepare_saving',
  prepareTesting: 'prepare_testing',
  confirmation: 'confirmation',
};

export const validationStatuses = {
  none: 'none',
  edited: 'edited',
  valid: 'valid',
  invalid: 'invalid',
  validation: 'validation',
};

export const mapStateToValidationStatus = {
  [states.none]: validationStatuses.none,
  [states.idle]: validationStatuses.edited,
  [states.ready]: validationStatuses.valid,
  [states.saved]: validationStatuses.valid,
  [states.confirmation]: validationStatuses.valid,
  [states.failure]: validationStatuses.invalid,
  [states.prepareSaving]: validationStatuses.validation,
  [states.prepareTesting]: validationStatuses.validation,
};

export const getGeneratorStatus = (templateState, current) =>
  templateState === taskTemplatesStates.none
    ? validationStatuses.none
    : mapStateToValidationStatus[current.value];

const machine = {
  id: 'task',
  initial: 'none',
  states: {
    none: {
      on: {
        SETUP_TASK: [
          { target: 'idle', cond: 'isBlank' },
          { target: 'saved', cond: 'isSaved' },
        ],
      },
    },
    idle: {
      on: {
        START_SAVING: 'prepare_saving',
        START_TESTING: 'prepare_testing',
      },
    },
    saved: {
      on: {
        CHANGES: 'idle',
        START_TESTING: { target: 'saved', actions: ['openTesting'] },
      },
    },
    ready: {
      on: {
        CHANGES: 'idle',
        START_SAVING: 'prepare_saving',
        START_TESTING: { target: 'ready', actions: ['openTesting'] },
      },
    },
    confirmation: {
      entry: ['showTaskSaveConfirmation'],
      exit: ['closeTaskSaveConfirmation'],
      on: {
        REJECT: 'ready',
        CONFIRM: 'saved',
      },
    },
    failure: {
      on: {
        CHANGES: 'idle',
      },
    },
    prepare_saving: {
      on: {
        FAILURE: { target: 'failure', actions: ['onFailure'] },
        ERROR: { target: 'failure', actions: ['onError'] },
        SUCCESS: { target: 'confirmation', actions: ['onSuccess'] },
      },
    },
    prepare_testing: {
      on: {
        FAILURE: { target: 'failure', actions: ['onFailure'] },
        ERROR: { target: 'failure', actions: ['onError'] },
        SUCCESS: { target: 'ready', actions: ['onSuccess', 'openTesting'] },
      },
    },
  },
};

export const config = {
  guards: {
    isBlank: (_ctx, { payload }) => payload.state === taskStateCodes.blank,
    isSaved: (_ctx, { payload }) => payload.state !== taskStateCodes.blank,
  },
  actions: {
    openTesting: () => {},
    saveTask: () => {},
    showTaskSaveConfirmation: () => {},
    onSuccess: () => {},
    onFailure: () => {},
    onError: () => {},
    handleError: assign({
      errorMessage: (_ctx, { payload }) => payload.message,
    }),
  },
};

export const taskMachineStates = states;

export default machine;
