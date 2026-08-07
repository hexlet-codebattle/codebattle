// Maps a Bootstrap alert variant (success/danger/info/warning/secondary) to the
// nearest Mantine color. The branded `.alert-dark-theme` gradient still drives the
// actual look via className; this keeps Mantine's fallback styling sensible.
const COLORS: Record<string, string> = {
  success: 'green',
  danger: 'red',
  info: 'blue',
  warning: 'yellow',
  secondary: 'gray',
  primary: 'blue',
};

export const bootstrapAlertColor = (variant?: string) => COLORS[variant ?? ''] ?? 'blue';
