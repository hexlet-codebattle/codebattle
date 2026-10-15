import { create } from 'zustand';

import type { GameLevel } from '@/features/lobby/types';

export type InviteState = 'pending' | 'accepted' | 'canceled' | 'expired' | 'dropped' | 'invalid';

export interface InviteUser {
  id: number;
  name: string;
}

// Codebattle.Invite JSON. Event payloads can be partial (expired/dropped carry
// only id and state), so everything but the id is optional when merging.
export interface Invite {
  id: number;
  state: InviteState;
  game_id?: number | null;
  game_params?: { level: GameLevel; type?: string; timeout_seconds?: number | null };
  creator_id?: number;
  recipient_id?: number;
  executor_id?: number | null;
  creator?: InviteUser;
  recipient?: InviteUser;
}

export interface CreateInviteParams {
  recipient_id: number;
  level: GameLevel;
  timeout_seconds: number;
  task_id: number | null;
}

type Push = <Reply = unknown>(event: string, payload?: Record<string, unknown>) => Promise<Reply>;

interface InvitesStore {
  invites: Record<number, Invite>;
  /** The "invites" channel's push, set by useInvitesChannel. */
  push: Push;
  setAll: (invites: Invite[]) => void;
  upsert: (invite: Partial<Invite> & { id: number }) => void;
}

export const useInvitesStore = create<InvitesStore>((set) => ({
  invites: {},
  push: () => Promise.reject(new Error('invites channel is not joined')),
  setAll: (invites) => set({ invites: Object.fromEntries(invites.map((invite) => [invite.id, invite])) }),
  upsert: (invite) =>
    set((state) => ({
      invites: { ...state.invites, [invite.id]: { ...state.invites[invite.id], ...invite } as Invite },
    })),
}));

export const selectPendingInvites = (state: InvitesStore) =>
  Object.values(state.invites)
    .filter((invite) => invite.state === 'pending')
    .sort((a, b) => b.id - a.id);
