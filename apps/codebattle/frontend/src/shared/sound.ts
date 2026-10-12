import { Howl, Howler } from 'howler';
import { create } from 'zustand';

// Sound themes served by Phoenix from priv/static/assets/audio (same sprites as
// the legacy frontend). Offsets are [startMs, durationMs] in each sprite file.

export type SoundTheme = 'dendy' | 'cs' | 'standard';
export type SoundEffect = 'check' | 'failure' | 'give_up' | 'round_created' | 'time_is_over' | 'win';

/** Codebattle.User.SoundSettings — levels are 0..10. */
export interface SoundSettings {
  type: SoundTheme | 'silent';
  level: number;
  tournament_level: number;
  muted: boolean;
}

const SPRITES: Record<SoundTheme, { src: string; sprite: Partial<Record<SoundEffect, [number, number]>> }> = {
  dendy: {
    src: '/assets/audio/audioSprites/dendySpritesAudio.wav',
    sprite: {
      check: [0, 40321],
      failure: [42000, 4122],
      give_up: [48000, 1950],
      round_created: [51000, 9156],
      time_is_over: [62000, 2531],
      win: [66000, 2902],
    },
  },
  cs: {
    src: '/assets/audio/audioSprites/csSpritesAudio.wav',
    sprite: {
      check: [0, 1501],
      failure: [3000, 1983],
      give_up: [6000, 1332],
      round_created: [9000, 1509],
      time_is_over: [12000, 1983],
      win: [15000, 4261],
    },
  },
  standard: {
    src: '/assets/audio/audioSprites/standardSpritesAudio.wav',
    sprite: {
      check: [0, 11000],
      give_up: [12000, 487],
      round_created: [14000, 335],
      time_is_over: [16000, 1069],
      win: [19000, 3553],
    },
  },
};

const players = new Map<SoundTheme, Howl>();

const player = (theme: SoundTheme) => {
  let howl = players.get(theme);
  if (!howl) {
    const { src, sprite } = SPRITES[theme];
    howl = new Howl({ src: [src], sprite: sprite as Record<string, [number, number]> });
    players.set(theme, howl);
  }

  return howl;
};

/** Plays one effect at `level` (0..10), cutting off whatever is playing. Ignores mute: callers decide. */
export function playSound(theme: SoundTheme, effect: SoundEffect, level: number) {
  Howler.stop();
  // Not every theme has every effect (Standard has no "failure").
  if (!SPRITES[theme].sprite[effect]) return;
  const howl = player(theme);
  const id = howl.play(effect);
  howl.volume(Math.max(0, Math.min(level, 10)) / 10, id);
}

export const hasSound = (theme: SoundTheme, effect: SoundEffect) => Boolean(SPRITES[theme].sprite[effect]);

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
}

export const useSoundStore = create<SoundState>((set) => ({
  muted: storedMute(),
  setMuted: (muted) => {
    try {
      localStorage.setItem(MUTE_KEY, String(muted));
    } catch {
      // storage disabled: the in-memory flag still applies to this page
    }
    Howler.mute(muted);
    set({ muted });
  },
}));

Howler.mute(useSoundStore.getState().muted);
