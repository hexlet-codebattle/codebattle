// The admin entry is shared by the Phoenix LiveViews and server-rendered forms.
import 'phoenix_html';

import { Socket } from 'phoenix';
import { LiveSocket } from 'phoenix_live_view';

import '../theme/fonts';
import './legacy-admin.css';
import './admin.css';

const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content ?? '';

const liveSocket = new LiveSocket('/live', Socket, {
  params: {
    _csrf_token: csrfToken,
    locale: Intl.NumberFormat().resolvedOptions().locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});

liveSocket.connect();

const sidebarToggle = document.querySelector<HTMLButtonElement>('#admin-sidebar-toggle');
const sidebarContent = document.querySelector<HTMLElement>('#admin-sidebar-content');

if (sidebarToggle && sidebarContent) {
  const desktop = window.matchMedia('(min-width: 768px)');
  const storageKey = 'adminSidebarCollapsed';

  let desktopCollapsed = false;
  let mobileOpen = false;
  let currentPath = window.location.pathname.replace(/\/+$/, '');

  try {
    desktopCollapsed = localStorage.getItem(storageKey) === '1';
  } catch {
    // The sidebar remains usable when browser storage is unavailable.
  }

  const updateSidebar = () => {
    const expanded = desktop.matches ? !desktopCollapsed : mobileOpen;
    document.body.classList.toggle('admin-sidebar-collapsed', desktop.matches && desktopCollapsed);
    sidebarContent.hidden = !desktop.matches && !mobileOpen;
    sidebarToggle.setAttribute('aria-expanded', String(expanded));
    sidebarToggle.setAttribute(
      'aria-label',
      desktop.matches ? (expanded ? 'Collapse admin navigation' : 'Expand admin navigation') : 'Menu',
    );
  };

  sidebarToggle.addEventListener('click', () => {
    if (desktop.matches) {
      desktopCollapsed = !desktopCollapsed;
      try {
        localStorage.setItem(storageKey, desktopCollapsed ? '1' : '0');
      } catch {
        // Use the current page's state when storage is unavailable.
      }
    } else {
      mobileOpen = !mobileOpen;
    }

    updateSidebar();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !desktop.matches && mobileOpen) {
      mobileOpen = false;
      updateSidebar();
      sidebarToggle.focus();
    }
  });

  desktop.addEventListener('change', () => {
    if (!desktop.matches && sidebarContent.contains(document.activeElement)) {
      sidebarToggle.focus();
    }
    mobileOpen = false;
    updateSidebar();
  });

  window.addEventListener('phx:navigate', () => {
    const path = window.location.pathname.replace(/\/+$/, '');
    if (path === currentPath) return;

    currentPath = path;
    for (const link of sidebarContent.querySelectorAll<HTMLAnchorElement>('nav a')) {
      const destination = link.pathname;
      if (path === destination) {
        link.setAttribute('aria-current', 'page');
      } else if (destination !== '/admin' && path.startsWith(`${destination}/`)) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    }

    if (!desktop.matches && mobileOpen) {
      mobileOpen = false;
      updateSidebar();
      document.getElementById('admin-main')?.focus({ preventScroll: true });
    }
  });

  updateSidebar();
  sidebarToggle.hidden = false;
}
