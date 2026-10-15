import { useLocalStorage } from '@mantine/hooks';

// The spectator screen's own look (stream monitors want big type), kept in this browser.
// The editor font key is the legacy page's, so a screen keeps its size after the switch.

export const EDITOR_FONT = { key: 'CodebattleSpectatorEditorFontSize', min: 10, max: 48, default: 20 };
export const TASK_FONT = { key: 'cb-spectator:task-font-size', min: 12, max: 40, default: 16 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function useFont({ key, min, max, default: fallback }: typeof EDITOR_FONT) {
  const [stored, setStored] = useLocalStorage<number>({ key, defaultValue: fallback, getInitialValueInEffect: false });
  const value = Number.isFinite(Number(stored)) ? clamp(Math.round(Number(stored)), min, max) : fallback;
  return {
    value,
    canDecrease: value > min,
    canIncrease: value < max,
    change: (delta: number) => setStored(clamp(value + delta, min, max)),
  };
}

export interface SpectatorPrefs {
  editorFont: ReturnType<typeof useFont>;
  taskFont: ReturnType<typeof useFont>;
  /** A name from EDITOR_THEMES ("auto" follows the site's light/dark). */
  theme: string;
  setTheme: (theme: string) => void;
  /** The toolbar's controls are hidden (a clean picture for the stream). */
  hideControls: boolean;
  setHideControls: (hidden: boolean) => void;
}

export function useSpectatorPrefs(): SpectatorPrefs {
  const editorFont = useFont(EDITOR_FONT);
  const taskFont = useFont(TASK_FONT);
  const [theme, setTheme] = useLocalStorage<string>({ key: 'cb-spectator:editor-theme', defaultValue: 'auto', getInitialValueInEffect: false });
  const [hideControls, setHideControls] = useLocalStorage<boolean>({
    key: 'cb-spectator:hide-controls',
    defaultValue: false,
    getInitialValueInEffect: false,
  });
  return { editorFont, taskFont, theme, setTheme, hideControls, setHideControls };
}
