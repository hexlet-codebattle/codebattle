import { Machine } from 'xstate';

export default Machine({
  initial: 'idle',
  states: {
    idle: {
      on: {
        typing: {
          target: 'typing',
          actions: ['startTyping', 'sound_start_typing'],
        },
        check_solution: {
          target: 'cheking',
          actions: ['startChecking', 'sound_start_checking'],
        },
      },
    },
    typing: {
      after: {
        1000: {
          target: 'idle',
          actions: ['endTyping', 'sound_end_typing'],
        },
      },
      on: {
        typing: 'typing',
        check_solution: {
          target: 'cheking',
          actions: ['sound_end_typing', 'startChecking', 'sound_start_checking'],
        },
      },
    },
    cheking: {
      after: {
        10000: {
          target: 'idle',
          actions: ['endChecking', 'sound_failure_checking'],
        },
      },
      on: {
        receive_check_result: {
          target: 'idle',
          actions: ['endChecking', 'sound_finished_checking'],
        },
      },
    },
    baned: {},
  },
});
