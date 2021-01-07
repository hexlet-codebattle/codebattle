import Gon from 'gon';

const currentUser = Gon.getAsset('current_user');
const getSoundLevel = user => {
  const defaultSoundLevel = 5;
  if (!currentUser) {
    return defaultSoundLevel;
  }
  const currentUserSoundLevel = user.sound_settings.level;
  return currentUserSoundLevel / 10;
};

const audioObj = new Audio('/assets/audio/audio_player_joined.wav');

const settings = {
  message: '*******',
  defaultTitle: document.title,
  intervalBlinking: 500,
  isActiveWindows: true,
};

let timerID = null;

const startBlinkingMsg = () => {
  timerID = setInterval(() => {
    audioObj.play();
    document.title = document.title === settings.message ? settings.defaultTitle : settings.message;
  }, settings.intervalBlinking);
};

const stopBlinkingMsg = () => {
  audioObj.pause();
  document.title = settings.defaultTitle;
  if (timerID) {
    clearInterval(timerID);
  }
};

const initialize = () => {
  window.addEventListener('focus', () => {
    stopBlinkingMsg();
    settings.isActiveWindows = true;
  });

  window.addEventListener('blur', () => {
    settings.isActiveWindows = false;
  });
};

const notification = () => {
  initialize();
  const userSoundLevel = getSoundLevel(currentUser);

  return {
    getVolume: () => audioObj.volume,
    setVolume: (value = userSoundLevel) => {
      audioObj.volume = value;
    },
    testSound: () => {
      audioObj.play();
    },
    start: () => {
      if (!settings.isActiveWindows) {
        startBlinkingMsg();
      }
    },
  };
};

export default notification;
