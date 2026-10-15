import type { usePresenceStore } from '@/features/presence/store';

/**
 * A "main" channel presence meta as the server tracks it (MainChannel.presence_meta/2
 * plus Phoenix's phx_ref). The presence store only types what the lobby needs, so the
 * admin-only fields are read from its raw state here.
 */
interface RawMeta {
  state?: string | null;
  path?: string | null;
  online_at?: string | number | null;
  phx_ref?: string | null;
  user?: { id: number; name?: string | null; avatar_url?: string | null; lang?: string | null };
}

type RawPresence = ReturnType<typeof usePresenceStore.getState>['raw'];

export interface Connection {
  key: string;
  userId: number;
  name: string;
  avatarUrl: string | null;
  lang: string | null;
  label: string;
  path: string | null;
  state: string | null;
  phxRef: string | null;
  /** Unix seconds. */
  onlineAt: number | null;
}

export interface PageGroup {
  label: string;
  userIds: number[];
  connections: Connection[];
}

/** Human page name for a pathname (legacy AdminWidget mapping). */
export function getPageLabel(path?: string | null) {
  if (!path) return 'Unknown';
  const p = path.split('?')[0].replace(/\/+$/, '') || '/';

  if (p === '/') return 'Lobby';
  if (p === '/maintenance') return 'Maintenance';
  if (p === '/waiting') return 'Waiting';
  if (p === '/authorized') return 'Authorized';

  if (/^\/games\/[^/]+\/stream$/.test(p)) return 'Game stream';
  if (/^\/games\/[^/]+\/ml$/.test(p)) return 'Game ML';
  if (/^\/games(\/|$)/.test(p)) return 'Game';

  if (p === '/tasks') return 'Tasks';
  if (/^\/tasks\/[^/]+/.test(p)) return 'Task';
  if (/^\/task_packs/.test(p)) return 'Task Packs';

  if (/^\/tournaments\/[^/]+\/edit$/.test(p)) return 'Tournament Edit';
  if (/^\/tournaments\/[^/]+\/stream/.test(p)) return 'Tournament Stream';
  if (/^\/tournaments\/[^/]+\/player/.test(p)) return 'Tournament Player';
  if (p === '/tournaments') return 'Tournaments';
  if (/^\/tournaments\/[^/]+/.test(p)) return 'Tournament';

  if (/^\/group_tournaments\/[^/]+\/admin/.test(p)) return 'Group Admin';
  if (/^\/group_tournaments/.test(p)) return 'Group Tournament';
  if (p === '/my-tournament') return 'My Tournament';

  if (p === '/schedule') return 'Schedule';
  if (p === '/hall_of_fame') return 'Hall of Fame';
  if (/^\/h2h\//.test(p)) return 'Head to Head';

  if (p === '/seasons') return 'Seasons';
  if (/^\/seasons\/[^/]+/.test(p)) return 'Season';

  if (p === '/clans') return 'Clans';
  if (/^\/clans\/[^/]+/.test(p)) return 'Clan';

  if (/^\/e\//.test(p)) return 'Event';

  if (p === '/users/new') return 'Sign Up';
  if (/^\/users\/[^/]+/.test(p)) return 'Profile';

  if (p === '/settings') return 'Settings';
  if (p === '/session/new') return 'Sign In';
  if (p === '/remind_password') return 'Password';
  if (/^\/feedback/.test(p)) return 'Feedback';

  if (/^\/admin\/connections/.test(p)) return 'Admin Connections';
  if (/^\/admin/.test(p)) return 'Admin';

  if (/^\/cssbattle/.test(p)) return 'CSS Battle';

  return p;
}

const DOT_COLORS = [
  'green',
  'blue',
  'violet',
  'orange',
  'yellow',
  'red',
  'cyan',
  'teal',
  'pink',
  'grape',
  'indigo',
  'lime',
];

/** A stable palette colour per page label. */
export function labelColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) % 9973;
  return `var(--mantine-color-${DOT_COLORS[hash % DOT_COLORS.length]}-5)`;
}

/** One entry per socket, grouped by page; biggest pages first. */
export function groupConnections(raw: RawPresence): PageGroup[] {
  const groups = new Map<string, { label: string; userIds: Set<number>; connections: Connection[] }>();

  Object.entries(raw).forEach(([key, { metas }]) => {
    (metas as RawMeta[]).forEach((meta, index) => {
      const userId = meta.user?.id ?? Number(key);
      const label = getPageLabel(meta.path);
      const group = groups.get(label) ?? { label, userIds: new Set<number>(), connections: [] };
      const onlineAt = Number(meta.online_at);

      group.userIds.add(userId);
      group.connections.push({
        key: `${userId}-${meta.phx_ref ?? index}`,
        userId,
        name: meta.user?.name || `#${userId}`,
        avatarUrl: meta.user?.avatar_url ?? null,
        lang: meta.user?.lang ?? null,
        label,
        path: meta.path ?? null,
        state: meta.state ?? null,
        phxRef: meta.phx_ref ?? null,
        onlineAt: onlineAt || null,
      });
      groups.set(label, group);
    });
  });

  return [...groups.values()]
    .map((group) => ({
      label: group.label,
      userIds: [...group.userIds],
      connections: group.connections.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.connections.length - a.connections.length || a.label.localeCompare(b.label));
}

export const countConnections = (raw: RawPresence) =>
  Object.values(raw).reduce((sum, { metas }) => sum + metas.length, 0);

/** Unique numeric ids from free text ("1, 2 3"). */
export const parseUserIds = (text: string): number[] => [...new Set((text.match(/\d+/g) ?? []).map(Number))];

/** Adds `ids` to the ids already in `text`, deduplicated. */
export const mergeUserIds = (text: string, ids: number[]) => parseUserIds(`${text} ${ids.join(' ')}`).join(', ');
