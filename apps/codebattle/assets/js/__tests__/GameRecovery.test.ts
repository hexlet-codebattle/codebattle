import machines from '../widgets/machines';
import { findCurrentUserPlayingGame } from '../widgets/middlewares/Lobby';

describe('game recovery flows', () => {
  test('opens and closes a loaded replay on the first event', () => {
    const machine = machines.game.withContext({
      ...machines.game.context,
      subscriptionType: 'premium',
    });

    const loading = machine.transition(machine.initialState, 'START_LOADING_PLAYBOOK');
    expect(loading.matches({ replayer: 'loading' })).toBe(true);

    const opened = machine.transition(loading, { type: 'LOAD_PLAYBOOK', payload: {} });
    expect(opened.matches({ replayer: 'on' })).toBe(true);

    const closed = machine.transition(opened, 'CLOSE_REPLAYER');
    expect(closed.matches({ replayer: 'off' })).toBe(true);
  });

  test('recovers a playing game from a lobby channel snapshot', () => {
    const games = [
      { id: 10, state: 'waiting_opponent', players: [{ id: 7 }] },
      { id: 11, state: 'playing', players: [{ id: 7 }, { id: 8 }] },
    ];

    expect(findCurrentUserPlayingGame(games, 7)?.id).toBe(11);
    expect(findCurrentUserPlayingGame(games, 9)).toBeUndefined();
  });
});
