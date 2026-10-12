import { create } from 'zustand';

import type { InviteUser } from './store';

/** The app-wide "invite to a battle" dialog (rendered by AppLayout), openable from anywhere. */
export const useInviteDialog = create<{
  opponent: InviteUser | null;
  opened: boolean;
  open: (opponent: InviteUser) => void;
  close: () => void;
}>((set) => ({
  opponent: null,
  opened: false,
  open: (opponent) => set({ opponent, opened: true }),
  close: () => set({ opened: false }),
}));
