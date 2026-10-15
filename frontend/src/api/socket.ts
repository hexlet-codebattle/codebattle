import { Socket } from 'phoenix';

// One socket per page load, created on first use with the Inertia `user_token`
// (CodebattleWeb.UserSocket verifies it). Channels are joined per feature.
let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = new Socket('/ws', { params: { token } });
    socket.connect();
  }

  return socket;
}
