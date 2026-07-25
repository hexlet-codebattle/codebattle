import { Howl, Howler } from 'howler';
import isUndefined from 'lodash/isUndefined';

import cs from '../config/sound/cs';
import dendy from '../config/sound/dendy';
import standard from '../config/sound/standard';
import { getPageProp } from '@/inertia/pageProps';

const audioPaths = {
  standard: '/assets/audio/audioSprites/standardSpritesAudio.wav',
  cs: '/assets/audio/audioSprites/csSpritesAudio.wav',
  dendy: '/assets/audio/audioSprites/dendySpritesAudio.wav',
  silent: '',
};

const audioConfigs = {
  standard,
  cs,
  dendy,
  silent: {},
};

interface SoundSettings {
  type: string;
  level: number;
  tournament_level?: number;
  tournamentLevel?: number;
}

const defaultSoundSettings: SoundSettings = { type: 'standard', level: 5 };
const initialSoundSettings = getPageProp<{ sound_settings: SoundSettings }>('current_user', {
  sound_settings: defaultSoundSettings,
}).sound_settings;

let currentSoundSettings = { ...defaultSoundSettings, ...initialSoundSettings };

const getSoundType = () => currentSoundSettings.type;
const getDefaultSoundLevel = () => currentSoundSettings.level * 0.1;
const getTournamentSoundLevel = () => {
  const tournamentLevel =
    currentSoundSettings.tournamentLevel ?? currentSoundSettings.tournament_level;

  return isUndefined(tournamentLevel) ? getDefaultSoundLevel() : tournamentLevel * 0.1;
};

const configureSound = (settings: SoundSettings) => {
  currentSoundSettings = { ...defaultSoundSettings, ...settings };
};

const audio = (type: string = getSoundType(), volume: number = getDefaultSoundLevel()) =>
  new Howl({
    src: audioPaths[type as keyof typeof audioPaths],
    sprite: (audioConfigs[type as keyof typeof audioConfigs] as { sprite?: unknown })
      ?.sprite as any,
    volume,
  });

const assetPlayers: Record<string, Howl> = {};
const getAssetPlayer = (path: string) => {
  if (!assetPlayers[path]) {
    assetPlayers[path] = new Howl({
      src: path,
      volume: getDefaultSoundLevel(),
    });
  }

  return assetPlayers[path];
};

// iOS Safari (and some other mobile browsers) keep the Web Audio context
// suspended until it is resumed inside a real user gesture. Howler's built-in
// autoUnlock is unreliable with Web Audio + sprites, so explicitly resume the
// shared context on the first user interactions. Without this, win/loss sounds
// — which are triggered by an incoming socket event, with no user gesture on
// the call stack — never play on mobile.
const resumeAudioContext = () => {
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume();
  }
};

if (typeof document !== 'undefined') {
  ['touchend', 'pointerdown', 'mousedown', 'keydown'].forEach((event) => {
    document.addEventListener(event, resumeAudioContext, { passive: true });
  });
}

const sound = {
  play: (type: string, soundLevel?: number) => {
    const isMute = JSON.parse((localStorage.getItem('ui_mute_sound') || false) as string);
    if (getSoundType() === 'silent' || isMute) return;
    const soundEffect = audio();
    Howler.volume(isUndefined(soundLevel) ? getDefaultSoundLevel() : soundLevel);
    soundEffect.play(type);
  },
  playAsset: (path: string, soundLevel?: number) => {
    const isMute = JSON.parse((localStorage.getItem('ui_mute_sound') || false) as string);
    if (getSoundType() === 'silent' || isMute) return;
    Howler.volume(isUndefined(soundLevel) ? getDefaultSoundLevel() : soundLevel);
    getAssetPlayer(path).play();
  },
  playTournamentAsset: (path: string) => {
    const isMute = JSON.parse((localStorage.getItem('ui_mute_sound') || false) as string);
    if (getSoundType() === 'silent' || isMute) return;
    Howler.volume(getTournamentSoundLevel());
    const player = getAssetPlayer(path);
    player.volume(1);
    player.play();
  },
  stop: () => Howler.stop(),
  toggle: (volume: number = getDefaultSoundLevel()) => {
    Howler.volume(volume);
  },
};

const createSound = (slug: string) => ({
  play: (type: string, soundLevel?: number) => {
    const soundEffect = audio(slug, soundLevel);
    soundEffect.play(type);
  },
});

const createPlayer = () => ({
  dendy: createSound('dendy'),
  cs: createSound('cs'),
  standard: createSound('standard'),
  silent: null,
  stop: () => Howler.stop(),
});

export { configureSound, createPlayer };
export default sound;
