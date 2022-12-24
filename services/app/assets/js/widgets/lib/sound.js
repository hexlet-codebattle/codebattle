import { Howl, Howler } from 'howler';
import _ from 'lodash';
// import Gon from 'gon';
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

const soundSettings = window.Gon.getAsset('current_user').sound_settings;
const soundType = soundSettings.type;
const defaultSoundLevel = soundSettings.level * 0.1;

const sprite = audioConfigs[soundType]?.sprite;
const audio = () => new Howl({
  src: [audioPaths[soundType]],
  sprite,
  volume: defaultSoundLevel,
});

const sound = {
  play: (type, soundLevel) => {
    const isMute = JSON.parse(localStorage.getItem('ui_mute_sound')) || false;
    const soundEffect = audio();
    if (soundType === 'silent' || isMute) return;
    Howler.volume(_.isUndefined(soundLevel) ? defaultSoundLevel : soundLevel);
    soundEffect.play(type);
  },
  stop: () => Howler.stop(),
  toggle: (volume = defaultSoundLevel) => {
    Howler.volume(volume);
  },
};

  function createSound(slug) {
    if (slug?.sprite?.win) {
      return new Howl({
        usingWebAudio: false,
        src: [slug.src],
        sprite: {
          win: slug.sprite.win,
        },
      });
    }
    return new Howl({ src: [slug.src] });
  }

  function soundFactory() {
    return {
      dendy: createSound(dendy),
      cs: createSound(cs),
      standart: createSound(standart),
      silent: null,
    };
  }
  export const sounds = () => soundFactory();
  export default sound;
