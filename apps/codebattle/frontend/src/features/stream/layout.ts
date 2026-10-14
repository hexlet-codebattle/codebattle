// The broadcast screen's windows. Positions are fractions of the screen (0..1), so one
// layout fits the browser, fullscreen and an OBS capture alike. Saved per browser.

export type WidgetId = 'task' | 'examples' | 'timer' | 'leftEditor' | 'rightEditor' | 'leftTests' | 'rightTests' | 'tournament';

export const WIDGETS: WidgetId[] = ['task', 'examples', 'timer', 'leftEditor', 'rightEditor', 'leftTests', 'rightTests', 'tournament'];

/** x, y, w, h as fractions of the screen. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StreamLayout {
  rects: Record<WidgetId, Rect>;
  visible: Record<WidgetId, boolean>;
  fontSizes: Record<WidgetId, number>;
  /** Stacking: later ids are on top. */
  order: WidgetId[];
}

export const DEFAULT_FONT_SIZE = 18;
export const FONT_LIMITS = { min: 10, max: 64 };
/** Drag / resize snap to 1/200 of the screen. */
export const SNAP = 0.005;
export const MIN_SIZE = 0.06;

const G = 0.006; // gap
const COL = (1 - G * 3) / 2;

export const DEFAULT_LAYOUT: StreamLayout = {
  rects: {
    task: { x: G, y: G, w: COL, h: 0.27 },
    examples: { x: G * 2 + COL, y: G, w: COL - 0.2 - G, h: 0.27 },
    timer: { x: 1 - G - 0.2, y: G, w: 0.2, h: 0.27 },
    leftEditor: { x: G, y: 0.27 + G * 2, w: COL, h: 0.47 },
    rightEditor: { x: G * 2 + COL, y: 0.27 + G * 2, w: COL, h: 0.47 },
    // Room for the score bar, the squares and the first failed test.
    leftTests: { x: G, y: 0.74 + G * 3, w: COL, h: 1 - (0.74 + G * 4) },
    rightTests: { x: G * 2 + COL, y: 0.74 + G * 3, w: COL, h: 1 - (0.74 + G * 4) },
    tournament: { x: 1 - G - 0.26, y: 0.3, w: 0.26, h: 0.42 },
  },
  visible: {
    task: true,
    examples: true,
    timer: true,
    leftEditor: true,
    rightEditor: true,
    leftTests: true,
    rightTests: true,
    tournament: false,
  },
  fontSizes: {
    task: DEFAULT_FONT_SIZE,
    examples: DEFAULT_FONT_SIZE,
    timer: DEFAULT_FONT_SIZE,
    leftEditor: DEFAULT_FONT_SIZE,
    rightEditor: DEFAULT_FONT_SIZE,
    leftTests: DEFAULT_FONT_SIZE,
    rightTests: DEFAULT_FONT_SIZE,
    tournament: DEFAULT_FONT_SIZE,
  },
  order: [...WIDGETS],
};

const STORAGE_KEY = 'cb-v2:stream-layout:v1';

const isRect = (rect: unknown): rect is Rect =>
  Boolean(rect) && ['x', 'y', 'w', 'h'].every((key) => typeof (rect as Record<string, unknown>)[key] === 'number');

export function loadLayout(): StreamLayout {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<StreamLayout> | null;
    if (!stored) return DEFAULT_LAYOUT;
    const rects = Object.fromEntries(
      WIDGETS.map((id) => [id, isRect(stored.rects?.[id]) ? stored.rects![id] : DEFAULT_LAYOUT.rects[id]]),
    ) as Record<WidgetId, Rect>;
    const order = [...(stored.order ?? []).filter((id) => WIDGETS.includes(id)), ...WIDGETS.filter((id) => !stored.order?.includes(id))];
    return {
      rects,
      visible: { ...DEFAULT_LAYOUT.visible, ...stored.visible },
      fontSizes: { ...DEFAULT_LAYOUT.fontSizes, ...stored.fontSizes },
      order,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(layout: StreamLayout) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // storage disabled: the layout lasts for this page
  }
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const snap = (n: number) => Math.round(n / SNAP) * SNAP;

/** Moves (drag) or resizes (resize) a rect by a delta in screen fractions, snapped and kept on screen. */
export function moveRect(start: Rect, dx: number, dy: number, mode: 'drag' | 'resize'): Rect {
  if (mode === 'drag') {
    return { ...start, x: clamp(snap(start.x + dx), 0, 1 - start.w), y: clamp(snap(start.y + dy), 0, 1 - start.h) };
  }
  return { ...start, w: clamp(snap(start.w + dx), MIN_SIZE, 1 - start.x), h: clamp(snap(start.h + dy), MIN_SIZE, 1 - start.y) };
}

/** URL options (OBS browser sources pass them per widget). */
export interface StreamParams {
  /** One widget alone, full-window and (mostly) transparent: an OBS overlay. */
  widget: WidgetId | null;
  widgetValid: boolean;
  fontSize: number | null;
  editorTheme: string | null;
  hideCup: boolean;
  cupX: number | null;
  cupY: number | null;
}

const ALLOWED_THEMES = new Set(['vs', 'vs-dark', 'hc-black', 'hc-light', 'cb-stream']);
const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

export function parseStreamParams(search: string): StreamParams {
  const params = new URLSearchParams(search);
  const widget = (params.get('widget') || '').trim();
  const theme = (params.get('editor_theme') || params.get('theme') || '').trim();
  const font = parseInt(params.get('font_size') || params.get('fontSize') || '', 10);
  const cupX = parseInt(params.get('cup_x') || params.get('cupX') || '', 10);
  const cupY = parseInt(params.get('cup_y') || params.get('cupY') || '', 10);
  const valid = !widget || (WIDGETS as string[]).includes(widget);

  return {
    widget: widget && valid ? (widget as WidgetId) : null,
    widgetValid: valid,
    fontSize: Number.isFinite(font) && font >= 8 && font <= 200 ? font : null,
    editorTheme: ALLOWED_THEMES.has(theme) ? theme : null,
    hideCup: TRUTHY.has((params.get('hide_cup') || '').toLowerCase()),
    cupX: Number.isFinite(cupX) ? cupX : null,
    cupY: Number.isFinite(cupY) ? cupY : null,
  };
}
