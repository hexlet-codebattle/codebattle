import { useEffect, useRef } from 'react';

import { useGameStore } from '@/features/game/store';

// What the broadcast effects react to, derived from the game store (the same one the
// game page uses): when a check started, who won / lost and when, how hard each
// player is typing. Kept in a ref so the effects loop reads it without re-rendering.

export interface Signals {
  checkAt: number;
  winAt: number;
  lossAt: number;
  winnerId: number | null;
  loserId: number | null;
  /** Per player: chars/s of the last edit and when it happened. */
  typing: Record<number, { speed: number; at: number }>;
  leftId: number | null;
}

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** 0..1: how hard the player is typing right now (decays within ~1.3 s). */
export function typingIntensity(signals: Signals, playerId: number | undefined, now: number) {
  const typing = playerId != null ? signals.typing[playerId] : undefined;
  if (!typing) return 0;
  return clamp(clamp(typing.speed / 14, 0, 1) * clamp(1 - (now - typing.at) / 1300, 0, 1), 0, 1);
}

export function useBattleSignals() {
  const signals = useRef<Signals>({ checkAt: 0, winAt: 0, lossAt: 0, winnerId: null, loserId: null, typing: {}, leftId: null });

  useEffect(
    () =>
      useGameStore.subscribe((state, previous) => {
        const now = Date.now();
        const s = signals.current;
        s.leftId = state.game?.players[0]?.id ?? null;

        // A check started.
        Object.entries(state.checking).forEach(([id, checking]) => {
          if (checking && !previous.checking[Number(id)]) s.checkAt = now;
        });

        // Someone typed: speed from the text length change.
        Object.entries(state.editors).forEach(([key, editor]) => {
          const id = Number(key);
          const before = previous.editors[id];
          if (!before || before.text === editor.text) return;
          const last = s.typing[id];
          const dt = Math.max(now - (last?.at ?? now), 1);
          s.typing[id] = { speed: clamp((Math.abs(editor.text.length - before.text.length) * 1000) / dt, 0, 24), at: now };
        });

        // The result landed.
        const winner = state.game?.players.find((player) => player.result === 'won');
        const loser = state.game?.players.find((player) => player.result === 'lost' || player.result === 'gave_up');
        if (winner && winner.id !== s.winnerId) Object.assign(s, { winAt: now, winnerId: winner.id });
        if (loser && loser.id !== s.loserId) Object.assign(s, { lossAt: now, loserId: loser.id });
      }),
    [],
  );

  return signals;
}
