// Default avatar: a playful, gender- and skin-neutral "coder" drawn in tints of
// one hue. Every trait (headwear, eyes, mouth, chest mark, hue) is picked from
// the user's id, so a person always gets the same face and lists look varied.
//
// Pure string builder (no React) so scripts can render previews of it too.

/** Shade 0 (lightest) … 9 (darkest) of the avatar's hue, as any CSS colour. */
export type Shade = (n: number) => string;

export const AVATAR_HUES = ['blue', 'violet', 'green', 'orange', 'red', 'slate'] as const;

/** Stable 32-bit mix of the id, so neighbouring ids get unrelated traits. */
function hash(seed: number) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export interface AvatarTraits {
  hue: (typeof AVATAR_HUES)[number];
  hat: number;
  eyes: number;
  mouth: number;
  mark: number;
}

const HATS = 6;
const EYES = 5;
const MOUTHS = 5;
const MARKS = 5;

export function avatarTraits(seed: number): AvatarTraits {
  const h = hash(seed);
  return {
    hue: AVATAR_HUES[h % AVATAR_HUES.length],
    hat: (h >>> 4) % HATS,
    eyes: (h >>> 9) % EYES,
    mouth: (h >>> 14) % MOUTHS,
    mark: (h >>> 19) % MARKS,
  };
}

// Head centre and size; everything is placed relative to the 64×64 canvas.
const FACE = { cx: 32, cy: 33, rx: 9.5, ry: 10.5 };

function headwear(kind: number, s: Shade) {
  switch (kind) {
    case 0: // headphones
      return `
        <path d="M20.5 33a11.5 11.5 0 0 1 23 0" fill="none" stroke="${s(3)}" stroke-width="2.6" stroke-linecap="round"/>
        <rect x="17.2" y="30.5" width="5.4" height="9" rx="2.7" fill="${s(3)}"/>
        <rect x="41.4" y="30.5" width="5.4" height="9" rx="2.7" fill="${s(3)}"/>`;
    case 1: // beanie with pompom
      return `
        <path d="M21.5 28.5c0-7 4.7-11.5 10.5-11.5s10.5 4.5 10.5 11.5z" fill="${s(4)}"/>
        <rect x="20.5" y="26.5" width="23" height="4.2" rx="2.1" fill="${s(2)}"/>
        <path d="M25 19.5v6M29 18v7M33 17.6v7.4M37 18v7M40.5 20v5.5" stroke="${s(5)}" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="32" cy="15.5" r="3.4" fill="${s(1)}"/>`;
    case 2: // propeller cap
      return `
        <path d="M22.5 27.5c0-5.6 4.2-9 9.5-9s9.5 3.4 9.5 9z" fill="${s(4)}"/>
        <path d="M22 27.5h21.5" stroke="${s(2)}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M32 18.5v-4" stroke="${s(9)}" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M32 14.2c-2.5-2.2-7-2.4-8.6-.8 1.8 1.4 5.8 1.6 8.6.8z" fill="${s(2)}"/>
        <path d="M32 14.2c2.5-2.2 7-2.4 8.6-.8-1.8 1.4-5.8 1.6-8.6.8z" fill="${s(5)}"/>
        <circle cx="32" cy="14.2" r="1.3" fill="${s(9)}"/>`;
    case 3: // cat-ear hood
      return `
        <path d="M19.5 26.5l1-10.5 7.2 5.4z" fill="${s(7)}"/>
        <path d="M44.5 26.5l-1-10.5-7.2 5.4z" fill="${s(7)}"/>
        <path d="M21.2 23.6l.5-5 3.5 2.7z" fill="${s(3)}"/>
        <path d="M42.8 23.6l-.5-5-3.5 2.7z" fill="${s(3)}"/>`;
    case 4: // antenna
      return `
        <path d="M32 22.6c-1.6-2.2 1.6-3.4 0-5.6s1.6-3.4 0-5.4" fill="none" stroke="${s(3)}" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="32" cy="10" r="2.6" fill="${s(1)}"/>
        <circle cx="32.8" cy="9.2" r=".8" fill="#fff" opacity=".8"/>`;
    default: // just the hood
      return '';
  }
}

function eyes(kind: number, s: Shade) {
  const ink = s(9);
  switch (kind) {
    case 0: // round glasses
      return `
        <g fill="none" stroke="${ink}" stroke-width="1.6">
          <circle cx="28" cy="32.4" r="3.4"/><circle cx="36" cy="32.4" r="3.4"/><path d="M31.4 32.2h1.2"/>
        </g>
        <circle cx="28.4" cy="32.6" r="1.1" fill="${ink}"/><circle cx="36.4" cy="32.6" r="1.1" fill="${ink}"/>`;
    case 1: // sunglasses
      return `
        <path d="M23.2 30.4h17.6" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M23.8 30.4h7.2v2.2c0 1.8-1.4 2.9-3.6 2.9s-3.6-1.1-3.6-2.9z" fill="${ink}"/>
        <path d="M33 30.4h7.2v2.2c0 1.8-1.4 2.9-3.6 2.9S33 34.4 33 32.6z" fill="${ink}"/>
        <path d="M25.4 31.4l1.6 1.4M34.6 31.4l1.6 1.4" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".7"/>`;
    case 2: // happy closed eyes ^ ^
      return `
        <g fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round">
          <path d="M25.6 33.2c.8-1.8 3.4-1.8 4.2 0"/><path d="M34.2 33.2c.8-1.8 3.4-1.8 4.2 0"/>
        </g>`;
    case 3: // wink
      return `
        <circle cx="27.8" cy="32.4" r="1.6" fill="${ink}"/>
        <path d="M34.2 32.8c.9.9 3.3.9 4.2 0" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>`;
    default: // big shiny eyes
      return `
        <circle cx="28" cy="32.4" r="2.5" fill="${ink}"/><circle cx="36" cy="32.4" r="2.5" fill="${ink}"/>
        <circle cx="28.8" cy="31.5" r=".9" fill="#fff"/><circle cx="36.8" cy="31.5" r=".9" fill="#fff"/>`;
  }
}

function mouth(kind: number, s: Shade) {
  const ink = s(8);
  switch (kind) {
    case 0: // smile
      return `<path d="M29 38.6c1.8 1.6 4.2 1.6 6 0" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
    case 1: // open grin
      return `<path d="M28.4 37.8h7.2c0 2.6-1.6 4.2-3.6 4.2s-3.6-1.6-3.6-4.2z" fill="${ink}"/>
        <path d="M29.6 40.4c1.4.9 3.4.9 4.8 0" fill="none" stroke="${s(4)}" stroke-width="1.2" stroke-linecap="round"/>`;
    case 2: // tongue out
      return `<path d="M28.8 38.4c2 1.2 4.4 1.2 6.4 0" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M32.6 39.2h2.6v1.4a1.3 1.3 0 0 1-2.6 0z" fill="${s(4)}"/>`;
    case 3: // "o"
      return `<ellipse cx="32" cy="39.4" rx="1.7" ry="2" fill="${ink}"/>`;
    default: // smirk
      return `<path d="M29.2 39.4c2.2.4 4.4-.1 6-1.6" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
}

function chestMark(kind: number, s: Shade) {
  const stroke = `fill="none" stroke="${s(2)}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case 0: // </>
      return `<g ${stroke}><path d="M26.5 52l-3.5 3.5 3.5 3.5"/><path d="M37.5 52l3.5 3.5-3.5 3.5"/><path d="M33.5 51l-3 9"/></g>`;
    case 1: // { }
      return `<g ${stroke}><path d="M29 51.5c-2 0-2 1-2 2.2s0 1.8-1.6 1.8c1.6 0 1.6.6 1.6 1.8s0 2.2 2 2.2"/><path d="M35 51.5c2 0 2 1 2 2.2s0 1.8 1.6 1.8c-1.6 0-1.6.6-1.6 1.8s0 2.2-2 2.2"/></g>`;
    case 2: // >_
      return `<g ${stroke}><path d="M25.5 52.2l3.6 3.3-3.6 3.3"/><path d="M31.5 59h7"/></g>`;
    case 3: // λ
      return `<g ${stroke}><path d="M28.5 51.2c1.6 0 2.4.8 3 2.4l3.8 6"/><path d="M31.9 54.6l-3.4 5"/></g>`;
    default: // #
      return `<g ${stroke}><path d="M29.5 51.5l-1.2 8M35.7 51.5l-1.2 8M26.8 54h10.4M26.2 57.2h10.4"/></g>`;
  }
}

/** Full SVG markup. `uid` keeps gradient ids unique when several avatars share a page. */
export function coderAvatarSvg(seed: number, shade: Shade, uid: string) {
  const traits = avatarTraits(seed);
  const s = shade;
  const gradient = `cbav-${uid}`;

  return `<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${gradient}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${s(4)}"/><stop offset="1" stop-color="${s(8)}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#${gradient})"/>
  <g fill="none" stroke="${s(2)}" stroke-width="1.6" stroke-linecap="round" opacity=".22">
    <path d="M7 9l-3 3 3 3M12 9l3 3-3 3"/>
    <path d="M53 8.5c-1.4 0-1.4.8-1.4 1.8s0 1.4-1.1 1.4c1.1 0 1.1.5 1.1 1.4s0 1.8 1.4 1.8M56.5 8.5c1.4 0 1.4.8 1.4 1.8s0 1.4 1.1 1.4c-1.1 0-1.1.5-1.1 1.4s0 1.8-1.4 1.8"/>
  </g>
  <path d="M8 64c1-13 10.5-21 24-21s23 8 24 21z" fill="${s(9)}"/>
  <path d="M17.5 36c0-11 6.5-20 14.5-20s14.5 9 14.5 20c0 4.5-2 7.5-4.5 9h-20c-2.5-1.5-4.5-4.5-4.5-9z" fill="${s(7)}"/>
  ${traits.hat === 3 ? headwear(3, s) : ''}
  <ellipse cx="${FACE.cx}" cy="${FACE.cy}" rx="${FACE.rx}" ry="${FACE.ry}" fill="${s(1)}"/>
  <ellipse cx="25.6" cy="37" rx="1.9" ry="1.2" fill="${s(3)}" opacity=".55"/>
  <ellipse cx="38.4" cy="37" rx="1.9" ry="1.2" fill="${s(3)}" opacity=".55"/>
  ${eyes(traits.eyes, s)}
  ${mouth(traits.mouth, s)}
  ${traits.hat === 3 ? '' : headwear(traits.hat, s)}
  ${chestMark(traits.mark, s)}
</svg>`;
}
