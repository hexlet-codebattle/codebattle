export type MessageSegment =
  | { kind: 'text'; value: string }
  | { kind: 'link'; href: string; text: string }
  | { kind: 'game'; id: number; href: string }
  | { kind: 'tournament'; id: number; href: string };

// Absolute URLs, plus bare site paths like "/games/42" typed by hand.
const LINK_PATTERN = /https?:\/\/[^\s<>"]+|(?<![\w/])\/(?:games|tournaments)\/\d+\/?(?![\w/])/g;
// Sentence punctuation right after a URL ("join https://…/games/1!") is not part of it.
const TRAILING_PUNCTUATION = /[.,!?;:)\]'"»]+$/;
const SITE_HOSTS = ['codebattle.hexlet.io'];

function isSiteHost(host: string) {
  return host === window.location.host || SITE_HOSTS.includes(host);
}

function classify(raw: string): MessageSegment {
  let url: URL;

  try {
    url = new URL(raw, window.location.origin);
  } catch {
    return { kind: 'text', value: raw };
  }

  if (isSiteHost(url.host)) {
    const game = url.pathname.match(/^\/games\/(\d+)\/?$/);
    if (game) return { kind: 'game', id: Number(game[1]), href: `/games/${game[1]}` };

    const tournament = url.pathname.match(/^\/tournaments\/(\d+)\/?$/);
    if (tournament) return { kind: 'tournament', id: Number(tournament[1]), href: `/tournaments/${tournament[1]}` };
  }

  return url.protocol === 'http:' || url.protocol === 'https:'
    ? { kind: 'link', href: url.href, text: raw }
    : { kind: 'text', value: raw };
}

/** Splits a chat message into plain text, ordinary links and game/tournament invites. */
export function linkify(text: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index;
    const raw = match[0].replace(TRAILING_PUNCTUATION, '');
    if (!raw) continue;

    if (start > cursor) segments.push({ kind: 'text', value: text.slice(cursor, start) });
    segments.push(classify(raw));
    cursor = start + raw.length;
  }

  if (cursor < text.length) segments.push({ kind: 'text', value: text.slice(cursor) });

  return segments;
}

/** The game URL to post when sharing a game into a chat. */
export const shareableGameUrl = (gameId: number) => `${window.location.origin}/games/${gameId}`;
