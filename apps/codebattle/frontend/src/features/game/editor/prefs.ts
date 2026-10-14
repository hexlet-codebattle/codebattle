import { create } from 'zustand';

// Per-browser editor preferences (not account settings), shared by both editors.
const KEY = 'cb-v2:editor-prefs';

export type LineNumbers = 'on' | 'relative' | 'off';

export interface Prefs {
  vim: boolean;
  fontSize: number;
  lineNumbers: LineNumbers;
  wordWrap: boolean;
  minimap: boolean;
  whitespace: boolean;
  bracketColors: boolean;
  stickyScroll: boolean;
  smoothCursor: boolean;
  /** A name from EDITOR_THEMES; "auto" follows the site's light/dark. */
  theme: string;
}

export const DEFAULT_PREFS: Prefs = {
  vim: false,
  fontSize: 14,
  lineNumbers: 'on',
  wordWrap: true,
  minimap: false,
  whitespace: false,
  bracketColors: true,
  stickyScroll: false,
  smoothCursor: true,
  theme: 'auto',
};

export const FONT_SIZES = { min: 11, max: 24 };

function load(): Prefs {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs> & { highContrast?: boolean };
    // The old high-contrast switch became a theme.
    const { highContrast, ...rest } = stored;
    return { ...DEFAULT_PREFS, ...(highContrast && !rest.theme ? { theme: 'high-contrast' } : {}), ...rest };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface PrefsStore extends Prefs {
  update: (patch: Partial<Prefs>) => void;
  reset: () => void;
}

const save = (prefs: Prefs) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // storage disabled: the preference lasts for this page
  }
};

const pick = ({ update: _update, reset: _reset, ...prefs }: PrefsStore): Prefs => prefs;

export const useEditorPrefs = create<PrefsStore>((set, get) => ({
  ...load(),
  update: (patch) => {
    set(patch);
    save(pick(get()));
  },
  reset: () => {
    set(DEFAULT_PREFS);
    save(DEFAULT_PREFS);
  },
}));
