import { Howl, Howler } from 'howler';
import { create } from 'zustand';

// Served by Phoenix from priv/static/assets/audio. The game set is synthesized in the
// tournament cues' voice by scripts/generate_game_sounds.py.
const GAME_SOUNDS = {
  check: '/assets/audio/game/check.wav',
  opponent_check: '/assets/audio/game/opponent_check.wav',
  win: '/assets/audio/game/win.wav',
  failure: '/assets/audio/game/failure.wav',
  give_up: '/assets/audio/game/give_up.wav',
  round_created: '/assets/audio/game/round_created.wav',
  time_is_over: '/assets/audio/game/time_is_over.wav',
  message: '/assets/audio/game/message.wav',
  invite: '/assets/audio/game/invite.wav',
  invite_accepted: '/assets/audio/game/invite_accepted.wav',
  rematch: '/assets/audio/game/rematch.wav',
} as const;

export type SoundEffect = keyof typeof GAME_SOUNDS;

/** Codebattle.User.SoundSettings — levels are 0..10. */
export interface SoundSettings {
  level: number;
  tournament_level: number;
  muted: boolean;
}

const howls = new Map<string, Howl>();

function play(src: string, level: number) {
  // The AudioContext only comes to life here, on the first sound (not at import): browsers
  // warn about (and suspend) a context created before any user gesture.
  Howler.mute(useSoundStore.getState().muted);
  let howl = howls.get(src);
  if (!howl) {
    howl = new Howl({ src: [src] });
    howls.set(src, howl);
  }
  const id = howl.play();
  howl.volume(Math.max(0, Math.min(level, 10)) / 10, id);
}

/** Plays one effect at `level` (0..10), cutting off whatever is playing. Ignores mute: callers decide. */
export function playSound(effect: SoundEffect, level: number) {
  Howler.stop();
  play(GAME_SOUNDS[effect], level);
}

export function stopSounds() {
  Howler.stop();
}

// Global mute. The server copy (sound_settings.muted) seeds it on page load;
// localStorage keeps it for guests and is what the legacy frontend reads.
const MUTE_KEY = 'ui_mute_sound';

function storedMute() {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

interface SoundState {
  muted: boolean;
  setMuted: (muted: boolean) => void;
  /** The account's sound levels, seeded from the shared props. */
  settings: Pick<SoundSettings, 'level' | 'tournament_level'>;
  setSettings: (settings: Partial<SoundState['settings']>) => void;
}

export const useSoundStore = create<SoundState>((set) => ({
  muted: storedMute(),
  settings: { level: 7, tournament_level: 7 },
  setSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
  setMuted: (muted) => {
    try {
      localStorage.setItem(MUTE_KEY, String(muted));
    } catch {
      // storage disabled: the in-memory flag still applies to this page
    }
    // Before the first sound there's no AudioContext yet; play() applies the flag then.
    if (Howler.ctx) Howler.mute(muted);
    set({ muted });
  },
}));

// Tournament cues (legacy config/tournamentSounds.ts), played at the tournament level.
const TOURNAMENT_SOUNDS = {
  started: '/assets/audio/tournament/tournament_start.wav',
  roundStarted: '/assets/audio/tournament/round_start.wav',
  roundFinished: '/assets/audio/tournament/round_finish.wav',
  finished: '/assets/audio/tournament/tournament_finish.wav',
} as const;

export type TournamentSound = keyof typeof TOURNAMENT_SOUNDS;

/** Plays a tournament cue at the tournament level (or `level`, for previews) unless sound is muted. */
export function playTournamentSound(sound: TournamentSound, level = useSoundStore.getState().settings.tournament_level) {
  if (useSoundStore.getState().muted) return;
  play(TOURNAMENT_SOUNDS[sound], level);
}

/**
 * Plays a game effect at the account's game level, unless muted. `overlap` layers it over
 * whatever is playing instead of cutting it off (background cues like the opponent's runs).
 */
export function playGameSound(effect: SoundEffect, { overlap = false }: { overlap?: boolean } = {}) {
  const { muted, settings } = useSoundStore.getState();
  if (muted) return;
  if (overlap) play(GAME_SOUNDS[effect], settings.level);
  else playSound(effect, settings.level);
}
