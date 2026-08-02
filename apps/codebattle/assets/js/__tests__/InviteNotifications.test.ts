import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listeners: new Map<string, (data: any) => void>(),
  play: vi.fn(),
}));

vi.mock('../socket', () => ({
  channelMethods: {
    invitesAccept: 'invites:accept',
    invitesCancel: 'invites:cancel',
    invitesCreate: 'invites:create',
  },
  channelTopics: {
    invitesAcceptedTopic: 'invites:accepted',
    invitesCanceledTopic: 'invites:canceled',
    invitesCreatedTopic: 'invites:created',
    invitesDroppedTopic: 'invites:dropped',
    invitesExpiredTopic: 'invites:expired',
    invitesInitTopic: 'invites:init',
  },
}));

vi.mock('../widgets/lib/sound', () => ({
  default: { play: mocks.play },
}));

vi.mock('../widgets/middlewares/Channel', () => ({
  default: class ChannelMock {
    addListener(topic: string, callback: (data: any) => void) {
      mocks.listeners.set(topic, callback);
      return this;
    }

    join() {
      const push = {
        receive: (status: string, callback: () => void) => {
          if (status === 'ok') callback();
          return push;
        },
      };

      return push;
    }

    push() {
      const push = { receive: () => push };
      return push;
    }
  },
}));

import { initInvites } from '../widgets/middlewares/Invite';

describe('invite notification sounds', () => {
  beforeEach(() => {
    mocks.listeners.clear();
    mocks.play.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('plays distinct sounds for received, accepted, and declined invites', () => {
    const currentUserId = 10;
    const dispatch = vi.fn();
    initInvites(currentUserId)(dispatch);

    mocks.listeners.get('invites:created')?.({
      invite: { creatorId: 20, recipientId: currentUserId, creator: { name: 'Creator' } },
    });
    expect(mocks.play).toHaveBeenLastCalledWith('round_created');

    mocks.listeners.get('invites:accepted')?.({
      invite: {
        creatorId: currentUserId,
        recipientId: 20,
        executorId: 20,
        gameId: 123,
        recipient: { name: 'Invitee' },
      },
    });
    expect(mocks.play).toHaveBeenLastCalledWith('win');

    mocks.listeners.get('invites:canceled')?.({
      invite: {
        creatorId: currentUserId,
        recipientId: 20,
        executorId: 20,
        recipient: { name: 'Invitee' },
      },
    });
    expect(mocks.play).toHaveBeenLastCalledWith('give_up');
    expect(mocks.play).toHaveBeenCalledTimes(3);
  });

  test('does not notify the user who performed the invite action', () => {
    const currentUserId = 10;
    initInvites(currentUserId)(vi.fn());

    mocks.listeners.get('invites:created')?.({
      invite: { creatorId: currentUserId, recipientId: 20 },
    });
    mocks.listeners.get('invites:accepted')?.({
      invite: { executorId: currentUserId, gameId: 123 },
    });
    mocks.listeners.get('invites:canceled')?.({
      invite: { executorId: currentUserId },
    });

    expect(mocks.play).not.toHaveBeenCalled();
  });
});
