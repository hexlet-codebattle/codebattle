import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Push = <Reply = unknown>(event: string, payload?: Record<string, unknown>) => Promise<Reply>;
type Cast = (event: string, payload?: Record<string, unknown>) => void;

/** The page's "main" channel, set by useMainChannel; no-ops until it's joined. */
export const useMainChannelStore = create<{ push: Push; cast: Cast }>(() => ({
  push: () => Promise.reject(new Error('main channel is not joined')),
  cast: () => {},
}));

/**
 * Follow mode: while following someone, every game they start opens here.
 * Persisted like the legacy app so it survives reloads; "paused" keeps the
 * target but stops the server subscription.
 */
interface FollowState {
  followId: number | null;
  followName: string | null;
  paused: boolean;
  setFollow: (user: { id: number; name: string } | null) => void;
  setPaused: (paused: boolean) => void;
}

export const useFollowStore = create<FollowState>()(
  persist(
    (set) => ({
      followId: null,
      followName: null,
      paused: false,
      setFollow: (user) => set({ followId: user?.id ?? null, followName: user?.name ?? null, paused: false }),
      setPaused: (paused) => set({ paused }),
    }),
    { name: 'cb-v2:follow' },
  ),
);

export type DeployPhase = 'started' | 'done' | 'failed';

/** Rolling-deploy notice shown as a top banner (deploy:handoff_* on "main"). */
export const useDeployStore = create<{ phase: DeployPhase | null; setPhase: (phase: DeployPhase | null) => void }>(
  (set) => ({ phase: null, setPhase: (phase) => set({ phase }) }),
);
