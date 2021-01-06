import { Machine } from "xstate";

// export default Machine({
//   id: "game",
//   initial: "idle",
//   states: {
//     idle: {
//       entry: (ctx, event) => {},
//       exit: (ctx, event) => {},
//       on: {
//         START: {
//           target: "started",
//           actions: [],
//           cond: (ctx, event) => true,
//         },
//       },
//     },
//     started: {},
//   },
// }, {
//   services: {
//     give_up: () => {},
//   },
//   guards: {
//     messageValid: () => true,
//   },
//   actions: {
//     action: () => {},
//   },
// })
