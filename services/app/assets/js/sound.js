import { Howl } from "howler";
import Gon from "gon";
import standart from "./widgets/config/sprites/standart";
import cs from "./widgets/config/sprites/cs";
import dendy from "./widgets/config/sprites/dendy";

const audioPaths = {
  standart: "/assets/audio/audioSprites/standartSpritesAudio.wav",
  cs: "/assets/audio/audioSprites/counter-strikeSpritesAudio.wav",
  dendy: "/assets/audio/audioSprites/dendySpritesAudio.wav",
};

const audioConfigs = {
  standart,
  cs,
  dendy,
};

const soundSettings = Gon.getAsset("current_user").sound_settings;
const soundType = soundSettings.type === "silent" ? "standart" : soundSettings.type;
const soundLevel = soundSettings.level * 0.1;

const sprite = audioConfigs[soundType].sprite;

console.log(audioConfigs[soundType]);
const audio = new Howl({
  src: [audioPaths[soundType]],
  sprite,
  volume: soundLevel
});

export default audio;