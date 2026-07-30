import { changePresenceState } from '../widgets/middlewares/Main';

describe('main channel middleware', () => {
  test('ignores presence changes when the main channel is not initialized', () => {
    expect(() => changePresenceState('watching')()).not.toThrow();
  });
});
