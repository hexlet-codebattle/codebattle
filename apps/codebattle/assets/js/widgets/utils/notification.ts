// Tab notification: blinks the browser tab title to grab the user's attention
// when something happens (e.g. an opponent is found and the battle starts)
// while the Codebattle tab is in the background. Blinking only runs while the
// tab is hidden and stops as soon as the user comes back to it.

const defaultMessage = '⚔️ Opponent found!';
const blinkIntervalMs = 1000;

const createTabNotification = () => {
  let timerId: ReturnType<typeof setInterval> | null = null;
  let originalTitle: string | null = null;
  let onReturn: (() => void) | null = null;

  const isTabHidden = () => document.visibilityState === 'hidden';

  const stop = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }

    if (originalTitle !== null) {
      document.title = originalTitle;
      originalTitle = null;
    }
  };

  const start = (message: string = defaultMessage) => {
    // Only nag from a background tab, and never stack multiple blink timers.
    if (!isTabHidden() || timerId) {
      return;
    }

    originalTitle = document.title;
    let showMessage = true;

    timerId = setInterval(() => {
      document.title = showMessage ? message : (originalTitle as string);
      showMessage = !showMessage;
    }, blinkIntervalMs);
  };

  // Runs `callback` once the user returns to the tab (immediately if the tab is
  // already visible). Used to defer an action — e.g. redirecting into the game
  // — until the user is actually looking at the page.
  const whenVisible = (callback: () => void) => {
    if (!isTabHidden()) {
      callback();
      return;
    }

    onReturn = callback;
  };

  document.addEventListener('visibilitychange', () => {
    if (isTabHidden()) {
      return;
    }

    stop();

    if (onReturn) {
      const callback = onReturn;
      onReturn = null;
      callback();
    }
  });

  return { start, stop, whenVisible, isTabHidden };
};

const notification = createTabNotification;

export default notification;
