import sound from '../lib/sound';

const settings = {
  message: '***PLAY***',
  defaultTitle: document.title,
  intervalBlinking: 3000,
  isActiveWindows: true,
};

let timerID = null;

const startBlinkingMsg = () => {
  timerID = setInterval(() => {
    sound.play('win');
    document.title = document.title === settings.message
        ? settings.defaultTitle
        : settings.message;
  }, settings.intervalBlinking);
};

const stopBlinkingMsg = () => {
  sound.stop();
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
    start: () => {
      if (!settings.isActiveWindows) {
        startBlinkingMsg();
      }
    },
  };
};

export default notification;
