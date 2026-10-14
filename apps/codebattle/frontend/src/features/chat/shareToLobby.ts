import { getSocket } from '@/api/socket';

const sharedKey = (gameId: number) => `cb-v2:shared-game:${gameId}`;

/** Whether this game was already posted to the lobby chat in this browser session. */
export function wasShared(gameId: number) {
  try {
    return sessionStorage.getItem(sharedKey(gameId)) === '1';
  } catch {
    return false;
  }
}

function markShared(gameId: number) {
  try {
    sessionStorage.setItem(sharedKey(gameId), '1');
  } catch {
    // Storage can be unavailable (private mode); the button then resets on reload.
  }
}

/**
 * Posts `text` to the lobby General chat from any page: joins "chat:lobby" just for
 * this message and leaves right after (the push and the leave go out in order).
 */
export function shareToLobbyChat(token: string, gameId: number, text: string) {
  return new Promise<void>((resolve, reject) => {
    const channel = getSocket(token).channel('chat:lobby', {});
    const fail = (reason: unknown) => {
      channel.leave();
      reject(reason instanceof Error ? reason : new Error('chat:lobby join failed'));
    };

    channel
      .join()
      .receive('ok', () => {
        channel.push('chat:add_msg', { text, meta: { type: 'general' } });
        channel.leave();
        markShared(gameId);
        resolve();
      })
      .receive('error', fail)
      .receive('timeout', () => fail(new Error('timeout')));
  });
}
