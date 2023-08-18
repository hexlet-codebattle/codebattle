import { Howl, Howler } from 'howler';
import isUndefined from 'lodash/isUndefined';
import Gon from 'gon';
import standart from '../config/sound/standart';
import cs from '../config/sound/cs';
import dendy from '../config/sound/dendy';

const audioPaths = {
  standart: '/assets/audio/audioSprites/standartSpritesAudio.wav',
  cs: '/assets/audio/audioSprites/csSpritesAudio.wav',
  dendy: '/assets/audio/audioSprites/dendySpritesAudio.wav',
  silent: '',
};

const audioConfigs = {
  standart,
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
    const isMute = JSON.parse(localStorage.getItem('ui_mute_sound')) || false;
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

const createSound = slug => ({
  play: (type, soundLevel) => {
    const soundEffect = audio(slug, soundLevel);
    soundEffect.play(type);
  },
});

const createPlayer = () => ({
  dendy: createSound('dendy'),
  cs: createSound('cs'),
  standart: createSound('standart'),
  silent: null,
  stop: () => Howler.stop(),
});

export { createPlayer };
export default sound;
