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

const audio = (type = soundType, volume = defaultSoundLevel) => new Howl({
  src: audioPaths[type],
  sprite: audioConfigs[type]?.sprite,
  volume,
});

const sound = {
  play: (type, soundLevel) => {
    const isMute = JSON.parse(localStorage.getItem('ui_mute_sound') || false);
    const soundEffect = audio();
    if (soundType === 'silent' || isMute) return;
    Howler.volume(isUndefined(soundLevel) ? defaultSoundLevel : soundLevel);
    soundEffect.play(type);
  },
  stop: () => Howler.stop(),
  toggle: (volume = defaultSoundLevel) => {
    Howler.volume(volume);
  },
};

const createSound = (slug) => ({
  play: (type, soundLevel) => {
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
