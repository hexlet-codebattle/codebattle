import { create } from 'zustand';

import type { InviteUser } from './store';

/**
 * The app-wide "invite to a battle" dialog (rendered by AppLayout), openable from anywhere.
 * Full-screen pages without AppLayout (a game) have no dialog: the lobby opens it instead.
 */
export const useInviteDialog = create<{
  opponent: InviteUser | null;
  opened: boolean;
  /** Whether a dialog is rendered on this page. */
  mounted: boolean;
  open: (opponent: InviteUser) => void;
  close: () => void;
  setMounted: (mounted: boolean) => void;
}>((set, get) => ({
  opponent: null,
  opened: false,
  mounted: false,
  open: (opponent) => {
    if (get().mounted) set({ opponent, opened: true });
    else window.location.assign(`/?opponent_id=${opponent.id}`);
  },
  close: () => set({ opened: false }),
  setMounted: (mounted) => set({ mounted }),
}));
