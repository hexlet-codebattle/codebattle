const audioFile = new Audio('/assets/audio/audio_player_joined.wav');

let timerID = null;
const message = '*******';
const defaultTitle = document.title;
const intervalBlinking = 500;

const startBlinkingMsg = () => {
    timerID = setInterval(() => {
      audioFile.play();
      document.title = document.title  === message ? defaultTitle : message;
    }, intervalBlinking);
};

const stopBlinkingMsg = () => {
    audioFile.pause();
    document.title = defaultTitle;
    if (timerID) {
      clearInterval(timerID);
    }
};

const notification = () => {
  let isActiveWindows = true;

  window.addEventListener('focus', () => {
    stopBlinkingMsg();
    isActiveWindows = true;
  });

  window.addEventListener('blur', () => {
    isActiveWindows = false;
  });

  return {
    start: () => {
      if (!isActiveWindows) {
        startBlinkingMsg();
      }
    },
  }
}

export default notification;
