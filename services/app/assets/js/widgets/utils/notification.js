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

  return {
    getVolume: () => audioObj.volume,
    setVolume: (value = 0.5) => {
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
