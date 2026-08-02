import { isIncomingPrivateMessage } from '../widgets/utils/chat';

vi.mock('@/inertia/pageProps', () => ({
  getPageProp: (key: string, fallback: unknown) => (key === 'current_user' ? { id: 7 } : fallback),
}));

describe('private message notifications', () => {
  test('recognizes a private message received by the current user', () => {
    expect(
      isIncomingPrivateMessage({
        userId: 9,
        meta: { type: 'private', targetUserId: 7 },
      }),
    ).toBe(true);
  });

  test('ignores sent private messages and public chat messages', () => {
    expect(
      isIncomingPrivateMessage({
        userId: 7,
        meta: { type: 'private', targetUserId: 9 },
      }),
    ).toBe(false);
    expect(isIncomingPrivateMessage({ userId: 9, meta: { type: 'general' } })).toBe(false);
  });
});
