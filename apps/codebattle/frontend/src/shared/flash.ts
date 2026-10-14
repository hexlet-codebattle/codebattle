import { notifications } from '@mantine/notifications';

const FLASH_COLORS: Record<string, string> = { info: 'blue', success: 'green', danger: 'red', error: 'red', warning: 'yellow' };

/** Phoenix flash (`put_flash(conn, :danger, ...)`) → toasts. */
export function showFlash(flash: Record<string, unknown>) {
  Object.entries(flash).forEach(([kind, message]) => {
    if (typeof message === 'string' && message) notifications.show({ color: FLASH_COLORS[kind] ?? 'gray', message });
  });
}
