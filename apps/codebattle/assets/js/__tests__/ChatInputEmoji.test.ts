import { getEmojiSearchQuery } from '../widgets/components/ChatInput';

describe('chat emoticon search', () => {
  test('maps happy and sad text emoticons to the matching emoji', () => {
    expect(getEmojiSearchQuery(':)')).toBe('smiley');
    expect(getEmojiSearchQuery(':(')).toBe('disappointed');
  });

  test('keeps regular emoji shortcodes unchanged', () => {
    expect(getEmojiSearchQuery(':rocket')).toBe('rocket');
  });
});
