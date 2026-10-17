// Admin pages (LiveView + server templates under /admin): the LiveView socket, phoenix_html
// (data-method / data-confirm links and forms) and the legacy Bootstrap-based admin styles.
// Kept apart from the app bundle (src/main.tsx), which never loads any of this.
import 'phoenix_html';

import { Socket } from 'phoenix';
import { LiveSocket } from 'phoenix_live_view';

import '../theme/fonts';
import './legacy-admin.css';

const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content ?? '';

const liveSocket = new LiveSocket('/live', Socket, {
  params: {
    _csrf_token: csrfToken,
    locale: Intl.NumberFormat().resolvedOptions().locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});

liveSocket.connect();
