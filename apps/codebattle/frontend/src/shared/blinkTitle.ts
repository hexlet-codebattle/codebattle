/**
 * Alternate the tab title with `title` every second until the tab is visible
 * again, then restore it and call `onVisible`. No-op blink when already visible.
 */
export function blinkTitleUntilVisible(title: string, onVisible?: () => void) {
  if (document.visibilityState === 'visible') {
    onVisible?.();
    return;
  }

  const originalTitle = document.title;
  const timer = window.setInterval(() => {
    document.title = document.title === title ? originalTitle : title;
  }, 1000);

  const handleVisibility = () => {
    if (document.visibilityState !== 'visible') return;

    window.clearInterval(timer);
    document.title = originalTitle;
    document.removeEventListener('visibilitychange', handleVisibility);
    onVisible?.();
  };

  document.addEventListener('visibilitychange', handleVisibility);
}
