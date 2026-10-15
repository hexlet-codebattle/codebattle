import { Presence } from 'phoenix';
import { create } from 'zustand';

// Activity a user reports on the "main" channel; a user with several tabs is
// shown by their most engaged one (legacy weights).
export type PresenceState = 'online' | 'lobby' | 'task' | 'tournament' | 'watching' | 'playing';

const WEIGHTS: Record<PresenceState, number> = {
  online: 0,
  lobby: 1,
  task: 2,
  tournament: 3,
  watching: 4,
  playing: 5,
};

export interface PresenceUser {
  id: number;
  name: string;
  lang: string | null;
  avatar_url: string | null;
  is_bot: boolean;
}

interface PresenceMeta {
  state: PresenceState;
  link: string | null;
  user: PresenceUser;
}

export interface OnlineUser extends PresenceUser {
  state: PresenceState;
  /** Game or tournament the user is in, e.g. "/games/12". */
  link: string | null;
}

type RawState = Record<string, { metas: PresenceMeta[] }>;

const toOnlineUsers = (raw: RawState): OnlineUser[] =>
  Object.values(raw)
    .map(({ metas }) => {
      const top = metas.reduce((best, meta) => ((WEIGHTS[meta.state] ?? 0) > (WEIGHTS[best.state] ?? 0) ? meta : best));
      return { ...top.user, state: top.state, link: top.link };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

interface PresenceStore {
  raw: RawState;
  users: OnlineUser[];
  /** True once the first full state arrived; diffs before it are meaningless. */
  synced: boolean;
  syncState: (state: RawState) => void;
  syncDiff: (diff: { joins: RawState; leaves: RawState }) => void;
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  raw: {},
  users: [],
  synced: false,
  syncState: (state) =>
    set((current) => {
      const raw = Presence.syncState(current.raw, state) as RawState;
      return { raw, users: toOnlineUsers(raw), synced: true };
    }),
  syncDiff: (diff) =>
    set((current) => {
      if (!current.synced) return current;
      const raw = Presence.syncDiff(current.raw, diff) as RawState;
      return { raw, users: toOnlineUsers(raw) };
    }),
}));
