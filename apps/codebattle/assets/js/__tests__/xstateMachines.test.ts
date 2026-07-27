import { createActor } from 'xstate';

import machines from '../widgets/machines';

// Smoke coverage: drive each machine through representative event paths so a
// regression in the xstate v5 action/guard/context wiring surfaces as a test
// failure (unresolved string references throw at evaluation time under v5).
describe('xstate machines', () => {
  test('game machine: network + room + replayer paths', () => {
    const actor = createActor(machines.game, { input: { subscriptionType: 'premium' } });
    actor.start();
    // network reconnection path (raise SHOW_ERROR_MESSAGE is delayed; just drive events)
    actor.send({ type: 'FAILURE' });
    expect(actor.getSnapshot().matches({ network: 'disconnected' })).toBe(true);
    actor.send({ type: 'JOIN' });
    expect(actor.getSnapshot().matches({ network: 'connected' })).toBe(true);
    // room active path via LOAD_GAME guard
    actor.send({ type: 'LOAD_GAME', payload: { state: 'playing' } });
    expect(actor.getSnapshot().matches({ room: 'active' })).toBe(true);
    // check_complete -> game_over with actions (soundWin/block/showModal are provided)
    actor.send({ type: 'user:check_complete', payload: { state: 'game_over' } });
    actor.stop();
  });

  test('editor machine: loading -> charging -> checking', () => {
    const actor = createActor(machines.editor, {
      input: { userId: 1, type: 'current_user', subscriptionType: 'free' },
    });
    actor.start();
    actor.send({ type: 'load_active_editor' });
    // free user cannot skip charging
    expect(actor.getSnapshot().matches('charging')).toBe(true);
    actor.send({ type: 'check_solution_received', userId: 1 });
    expect(actor.getSnapshot().matches('checking')).toBe(true);
    actor.send({ type: 'receive_check_result', userId: 1 });
    expect(actor.getSnapshot().matches('charging')).toBe(true);
    actor.stop();
  });

  test('task machine: setup -> saving -> confirmation', () => {
    const actor = createActor(machines.task);
    actor.start();
    actor.send({ type: 'SETUP_TASK', payload: { state: 'blank' } });
    expect(actor.getSnapshot().matches('idle')).toBe(true);
    actor.send({ type: 'START_SAVING' });
    expect(actor.getSnapshot().matches('prepare_saving')).toBe(true);
    actor.send({ type: 'SUCCESS' });
    expect(actor.getSnapshot().matches('confirmation')).toBe(true);
    actor.stop();
  });

  test('spectator machine: preview -> active -> game_over', () => {
    const actor = createActor(machines.spectator, { input: { userId: 2, type: 'player' } });
    actor.start();
    actor.send({ type: 'LOAD_GAME', payload: { state: 'playing' } });
    expect(actor.getSnapshot().matches({ room: 'active' })).toBe(true);
    actor.send({ type: 'user:give_up', payload: {} });
    expect(actor.getSnapshot().matches({ room: 'game_over' })).toBe(true);
    actor.stop();
  });
});
