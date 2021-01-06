import gameMachine from '../widgets/machines/game';
import { interpret } from 'xstate';

// describe('testing some xstate machine', () => {
//   test('testing pure transition', async () => {
//     const expectedValue = 'started';
//     const actualState = gameMachine.transition('idle', 'START');


//     expect(actualState.matches(expectedValue)).toBeTruthy();
//   });

//   test('testing xstate service', async (done) => {
//     const service = interpret(gameMachine).onTransition((state) => {
//       if (state.matches("started")) {
//         done();
//       }
//     });

//     service.start();
//     service.send({ type: "START" });
//   });
// });
