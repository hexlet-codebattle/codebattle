// Maps a Bootstrap alert variant (success/danger/info/warning/secondary) to the
// nearest Mantine color, used as the Mantine `color` fallback on <Alert>s.
const COLORS: Record<string, string> = {
  success: 'green',
  danger: 'red',
  info: 'blue',
  warning: 'yellow',
  secondary: 'gray',
  primary: 'blue',
};

export const bootstrapAlertColor = (variant?: string) => COLORS[variant ?? ''] ?? 'blue';

interface DarkThemeVariant {
  gradient: readonly [string, string];
  border: string;
  text: string;
}

// Ports the legacy `.alert-dark-theme` design (was SCSS in style.scss) — a
// per-variant gradient panel with a colored left border and a blurred backdrop.
// `info` reuses the green gradient exactly as the SCSS did.
const DARK_THEME_VARIANTS: Record<string, DarkThemeVariant> = {
  success: {
    gradient: ['rgba(25, 135, 84, 0.9)', 'rgba(25, 135, 84, 0.7)'],
    border: '#198754',
    text: '#ffffff',
  },
  info: {
    gradient: ['rgba(25, 135, 84, 0.9)', 'rgba(25, 135, 84, 0.7)'],
    border: '#198754',
    text: '#ffffff',
  },
  danger: {
    gradient: ['rgba(220, 53, 69, 0.9)', 'rgba(220, 53, 69, 0.7)'],
    border: '#dc3545',
    text: '#ffffff',
  },
  warning: {
    gradient: ['rgba(255, 193, 7, 0.9)', 'rgba(255, 193, 7, 0.7)'],
    border: '#ffc107',
    text: '#000000',
  },
};

// Mantine `styles` reproducing `.alert-dark-theme` for use on <Alert> in place
// of the Bootstrap `alert alert-${status} alert-dark-theme` class set. Shared by
// every dark-theme alert (feedback, settings, tournament edit, game result).
export const darkThemeAlertStyles = (status?: string) => {
  const v = DARK_THEME_VARIANTS[status ?? ''] ?? DARK_THEME_VARIANTS.info;
  const color = { color: v.text };
  return {
    root: {
      border: 'none',
      borderLeft: `4px solid ${v.border}`,
      background: `linear-gradient(135deg, ${v.gradient[0]}, ${v.gradient[1]})`,
      backdropFilter: 'blur(10px)',
      ...color,
    },
    title: color,
    message: color,
    closeButton: color,
  };
};
