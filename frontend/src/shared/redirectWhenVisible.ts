import { blinkTitleUntilVisible } from './blinkTitle';

/**
 * Navigate to `url`; if the tab is in the background, blink `title` in the tab
 * first and navigate once the user comes back.
 */
export function redirectWhenVisible(url: string, title: string) {
  blinkTitleUntilVisible(title, () => window.location.assign(url));
}
