import notification from '../widgets/utils/notification';

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('tab notification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = 'Codebattle';
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('does not blink and runs whenVisible immediately while the tab is visible', () => {
    const notify = notification();
    const onReturn = vi.fn();

    notify.start('⚔️ Opponent found!');
    vi.advanceTimersByTime(3000);
    expect(document.title).toBe('Codebattle');

    notify.whenVisible(onReturn);
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  test('blinks the title while hidden, restores it and defers whenVisible until the user returns', () => {
    const notify = notification();
    const onReturn = vi.fn();

    setVisibility('hidden');
    notify.start('⚔️ Opponent found!');
    notify.whenVisible(onReturn);

    // the redirect callback is deferred while the tab is in the background
    expect(onReturn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(document.title).toBe('⚔️ Opponent found!');
    vi.advanceTimersByTime(1000);
    expect(document.title).toBe('Codebattle');

    // the user comes back: blinking stops, title is restored, callback fires once
    setVisibility('visible');
    expect(document.title).toBe('Codebattle');
    expect(onReturn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3000);
    expect(document.title).toBe('Codebattle');
  });
});
