import Gon from 'gon';
import { Howl, Howler } from 'howler';
import isUndefined from 'lodash/isUndefined';

import cs from '../config/sound/cs';
import dendy from '../config/sound/dendy';
import standard from '../config/sound/standard';

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

const soundSettings = Gon.getAsset('current_user').sound_settings;
const soundType = soundSettings.type;
const defaultSoundLevel = soundSettings.level * 0.1;
const tournamentSoundLevel = isUndefined(soundSettings.tournament_level)
  ? defaultSoundLevel
  : soundSettings.tournament_level * 0.1;

const audio = (type: string = soundType, volume: number = defaultSoundLevel) =>
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
      volume: defaultSoundLevel,
    });
  }

  return assetPlayers[path];
};

const sound = {
  play: (type: string, soundLevel?: number) => {
    const isMute = JSON.parse((localStorage.getItem('ui_mute_sound') || false) as string);
    const soundEffect = audio();
    if (soundType === 'silent' || isMute) return;
    Howler.volume(isUndefined(soundLevel) ? defaultSoundLevel : soundLevel);
    soundEffect.play(type);
  },
  playAsset: (path: string, soundLevel?: number) => {
    const isMute = JSON.parse((localStorage.getItem('ui_mute_sound') || false) as string);
    if (soundType === 'silent' || isMute) return;
    Howler.volume(isUndefined(soundLevel) ? defaultSoundLevel : soundLevel);
    getAssetPlayer(path).play();
  },
  playTournamentAsset: (path: string) => {
    const isMute = JSON.parse((localStorage.getItem('ui_mute_sound') || false) as string);
    if (soundType === 'silent' || isMute) return;
    Howler.volume(tournamentSoundLevel);
    const player = getAssetPlayer(path);
    player.volume(1);
    player.play();
  },
  stop: () => Howler.stop(),
  toggle: (volume: number = defaultSoundLevel) => {
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

export { createPlayer };
export default sound;
