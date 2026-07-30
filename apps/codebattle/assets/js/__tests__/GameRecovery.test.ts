import { createActor } from 'xstate';

import machines from '../widgets/machines';
import { findCurrentUserPlayingGame } from '../widgets/middlewares/Lobby';

describe('game recovery flows', () => {
  test('opens, closes, and reopens a loaded replay on the first event', () => {
    // xstate v5: seed context via `input` and drive the machine through a running actor.
    const actor = createActor(machines.game, { input: { subscriptionType: 'premium' } });
    actor.start();

    actor.send({ type: 'START_LOADING_PLAYBOOK' });
    expect(actor.getSnapshot().matches({ replayer: 'loading' })).toBe(true);

    actor.send({ type: 'LOAD_PLAYBOOK', payload: {} });
    expect(actor.getSnapshot().matches({ replayer: 'on' })).toBe(true);

    actor.send({ type: 'SET_SPEED_MODE', speedMode: '2.5x' });
    expect(actor.getSnapshot().context.speedMode).toBe('2.5x');

    actor.send({ type: 'CLOSE_REPLAYER' });
    expect(actor.getSnapshot().matches({ replayer: 'off' })).toBe(true);

    actor.send({ type: 'OPEN_REPLAYER' });
    expect(actor.getSnapshot().matches({ replayer: 'on' })).toBe(true);

    actor.send({ type: 'CLOSE_REPLAYER' });
    expect(actor.getSnapshot().matches({ replayer: 'off' })).toBe(true);

    actor.stop();
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
