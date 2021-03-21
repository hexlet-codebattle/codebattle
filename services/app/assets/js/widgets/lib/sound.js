import { Howl, Howler } from "howler";
import _ from "lodash";
import Gon from "gon";
import standart from "../config/sound/standart";
import cs from "../config/sound/cs";
import dendy from "../config/sound/dendy";

const audioPaths = {
  standart: "/assets/audio/audioSprites/standartSpritesAudio.wav",
  cs: "/assets/audio/audioSprites/csSpritesAudio.wav",
  dendy: "/assets/audio/audioSprites/dendySpritesAudio.wav",
  silent: "",
};

const audioConfigs = {
  standart,
  cs,
  dendy,
  silent: {},
};

const soundSettings = Gon.getAsset("current_user").sound_settings;
const soundType = soundSettings.type;
const defaultSoundLevel = soundSettings.level * 0.1;

const sprite = audioConfigs[soundType]?.sprite;

const audio = new Howl({
  src: [audioPaths[soundType]],
  sprite,
  volume: defaultSoundLevel,
});

export default {
  play: (type, soundLevel) => {
    if (soundType === "silent") return;
    Howler.volume(_.isUndefined(soundLevel) ? defaultSoundLevel : soundLevel);
    audio.play(type);
  },
  stop: () => Howler.stop(),
};
