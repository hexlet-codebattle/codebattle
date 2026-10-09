import { changePresenceState, getMajorMeta } from '../widgets/middlewares/Main';

describe('main channel middleware', () => {
  test('ignores presence changes when the main channel is not initialized', () => {
    expect(() => changePresenceState('watching')()).not.toThrow();
  });

  test('picks the heaviest presence state with its safe link', () => {
    expect(
      getMajorMeta([
        { state: 'lobby', link: null },
        { state: 'playing', link: '/games/7' },
        { state: 'watching', link: '/games/9' },
      ]),
    ).toEqual({ state: 'playing', link: '/games/7' });

    expect(getMajorMeta([{ state: 'watching', link: 'javascript:alert(1)' }])).toEqual({
      state: 'watching',
      link: null,
    });
  });
});
