import { customEmoji, EMOJI } from './emoji';

// "@name" not glued to a preceding word ("me@mail.com" is no mention). Names are letters, digits,
// "_", "-" and (older accounts) "."; a trailing "." or "-" is sentence punctuation.
const MENTION_PATTERN = /(?<![\w@])@([\w][\w.-]*)/g;
const MENTION_TRAILING = /[.-]+$/;
// A complete ":shortcode:" typed by hand.
const SHORTCODE_PATTERN = /:([\w+#-]+):/g;

export type InlineSegment = { kind: 'text' | 'emoji'; value: string } | { kind: 'mention'; name: string };

/** Names mentioned in `text`, as typed. */
export function mentionedNames(text: string) {
  return [...text.matchAll(MENTION_PATTERN)].map((match) => match[1].replace(MENTION_TRAILING, '')).filter(Boolean);
}

/** True when `text` mentions `name` (case-insensitive, like the name lookup). */
export function mentions(text: string, name: string | null | undefined) {
  if (!name) return false;
  const needle = name.toLowerCase();

  return mentionedNames(text).some((mentioned) => mentioned.toLowerCase() === needle);
}

const replaceShortcodes = (text: string) =>
  text.replace(SHORTCODE_PATTERN, (code, name: string) =>
    !customEmoji(code) && Object.hasOwn(EMOJI, name) ? EMOJI[name] : code,
  );

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3/u;

/** One visible emoji, including joined emoji, skin tones, flags and shortcodes. */
export function singleEmoji(text: string): string | null {
  const value = replaceShortcodes(text.trim());
  if (customEmoji(value)) return value;
  if (!EMOJI_PATTERN.test(value) || [...graphemes.segment(value)].length !== 1) return null;

  return value;
}

function splitEmoji(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(SHORTCODE_PATTERN)) {
    if (!customEmoji(match[0])) continue;
    if (match.index > cursor) segments.push({ kind: 'text', value: replaceShortcodes(text.slice(cursor, match.index)) });
    segments.push({ kind: 'emoji', value: match[0] });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) segments.push({ kind: 'text', value: replaceShortcodes(text.slice(cursor)) });

  return segments;
}

/** Splits plain message text into text and @mentions, with ":shortcode:" turned into emoji. */
export function splitInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MENTION_PATTERN)) {
    const name = match[1].replace(MENTION_TRAILING, '');
    if (!name) continue;

    if (match.index > cursor) segments.push(...splitEmoji(text.slice(cursor, match.index)));
    segments.push({ kind: 'mention', name });
    cursor = match.index + 1 + name.length;
  }

  if (cursor < text.length) segments.push(...splitEmoji(text.slice(cursor)));

  return segments;
}

/** The "@query" or ":query" being typed right before the caret, if any. */
export function activeToken(value: string, caret: number) {
  const match = value.slice(0, caret).match(/(?:^|[\s(])([@:])([\w.+#-]*)$/);
  if (!match) return null;

  const [, trigger, query] = match;
  // ":" alone is everyday punctuation ("time: 5"); Slack waits for two letters too.
  if (trigger === ':' && query.length < 2) return null;

  return { trigger: trigger as '@' | ':', query, start: caret - query.length - 1 };
}
