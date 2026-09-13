import { currentUserIsAdminSelector, lobbyDataSelector } from '@/selectors';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  Box,
  Button,
  Flex,
  NativeSelect,
  Paper,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Modal from '@/components/CbModal';
import { type AppDispatch } from '@/slices';

import { broadcastRedirect, fetchTournamentPlayerIds } from '../../middlewares/Main';
import MainChannelContainer from '../../components/MainChannelContainer';

interface PresenceMeta {
  path?: string | null;
  state?: string | null;
  phxRef?: string | null;
  phx_ref?: string | null;
  onlineAt?: string | number | null;
}

interface PresenceEntry {
  id: number;
  count?: number;
  user?: { name?: string };
  userPresence?: PresenceMeta[];
}

interface Connection {
  key: string;
  userId: number;
  name: string;
  label: string;
  path: string | null;
  state: string | null;
  phxRef: string | null;
  onlineAt: string | null;
}

interface PageGroup {
  label: string;
  users: number;
  connections: Connection[];
}

const getPageLabel = (path?: string | null) => {
  if (!path) return 'Unknown';
  const p = path.split('?')[0].replace(/\/+$/, '') || '/';

  if (p === '/') return 'Lobby';
  if (p === '/maintenance') return 'Maintenance';
  if (p === '/waiting') return 'Waiting';
  if (p === '/authorized') return 'Authorized';

  if (/^\/games\/[^/]+\/threejs$/.test(p)) return 'Game 3D';
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
};

const labelColor = (label: string) => {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) {
    h = (h * 31 + label.charCodeAt(i)) % 360;
  }
  return `hsl(${h}, 70%, 62%)`;
};

const formatOnlineAt = (onlineAt?: string | number | null) => {
  const seconds = Number(onlineAt);
  if (!seconds) return null;
  return new Date(seconds * 1000).toLocaleTimeString();
};

const dotStyle = (color: string): React.CSSProperties => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: color,
  boxShadow: `0 0 6px ${color}`,
  flexShrink: 0,
});

const userCardStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  maxWidth: '220px',
  minWidth: 0,
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  fontSize: '13px',
  cursor: 'pointer',
};

interface UserCardProps {
  connection: Connection;
  onSelect: (connection: Connection) => void;
}

function UserCard({ connection, onSelect }: UserCardProps) {
  return (
    <UnstyledButton style={userCardStyle} onClick={() => onSelect(connection)}>
      <FontAwesomeIcon
        icon="user"
        style={{ fontSize: '11px', color: 'var(--mantine-color-dimmed)' }}
      />
      <Text truncate fw={600}>
        {connection.name}
      </Text>
    </UnstyledButton>
  );
}

interface PageSectionProps {
  group: PageGroup;
  onSelect: (connection: Connection) => void;
}

function PageSection({ group, onSelect }: PageSectionProps) {
  const color = labelColor(group.label);

  return (
    <Box mb="lg">
      <Flex align="center" gap="xs" mb="xs">
        <span style={dotStyle(color)} />
        <Text fw={700}>{group.label}</Text>
        <Text c="dimmed" size="xs">
          {group.users} · {group.connections.length}
        </Text>
      </Flex>
      <Flex wrap="wrap" gap="xs">
        {group.connections.map((connection) => (
          <UserCard key={connection.key} connection={connection} onSelect={onSelect} />
        ))}
      </Flex>
    </Box>
  );
}

interface ConnectionRowProps {
  label: React.ReactNode;
  value?: React.ReactNode;
}

function ConnectionRow({ label, value }: ConnectionRowProps) {
  return (
    <Flex gap="md" py={4}>
      <Text c="dimmed" style={{ minWidth: '110px', flexShrink: 0 }}>
        {label}
      </Text>
      <Text
        style={{
          wordBreak: 'break-word',
          fontFamily: 'var(--mantine-font-family-monospace)',
        }}
      >
        {value ?? '—'}
      </Text>
    </Flex>
  );
}

interface ConnectionModalProps {
  connection: Connection | null;
  onHide: () => void;
}

function ConnectionModal({ connection, onHide }: ConnectionModalProps) {
  return (
    <Modal show={!!connection} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Connection details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {connection && (
          <>
            <ConnectionRow label="User" value={connection.name} />
            <ConnectionRow label="User ID" value={connection.userId} />
            <ConnectionRow label="Page" value={connection.label} />
            <ConnectionRow label="Path" value={connection.path} />
            <ConnectionRow label="State" value={connection.state} />
            <ConnectionRow label="Connected at" value={connection.onlineAt} />
            <ConnectionRow label="Ref" value={connection.phxRef} />
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}

const REDIRECT_ROUTES = [
  {
    label: 'Group Tournament',
    value: 'group_tournaments',
    placeholder: 'ID',
    build: (id: string) => `/group_tournaments/${id}`,
  },
  {
    label: 'Game',
    value: 'games',
    placeholder: 'Game ID',
    build: (id: string) => `/games/${id}`,
  },
  {
    label: 'Tournament',
    value: 'tournaments',
    placeholder: 'Tournament ID',
    build: (id: string) => `/tournaments/${id}`,
  },
  {
    label: 'Event',
    value: 'events',
    placeholder: 'Event slug',
    build: (slug: string) => `/e/${slug}`,
  },
];

const parseUserIds = (raw: string): number[] => [...new Set((raw.match(/\d+/g) || []).map(Number))];

interface RedirectPanelProps {
  allUserIds: number[];
}

function RedirectPanel({ allUserIds }: RedirectPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [route, setRoute] = useState(REDIRECT_ROUTES[0].value);
  const [id, setId] = useState('');
  const [userIdsRaw, setUserIdsRaw] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const userIds = useMemo(() => parseUserIds(userIdsRaw), [userIdsRaw]);

  const selectedRoute = useMemo(
    () => REDIRECT_ROUTES.find((item) => item.value === route) || REDIRECT_ROUTES[0],
    [route],
  );

  const handleFetch = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedTournamentId = tournamentId.trim();
    if (!trimmedTournamentId) return;

    setStatus('fetching');
    dispatch(
      fetchTournamentPlayerIds(
        // Preserves the original runtime value: the raw trimmed string is sent
        // over the channel as-is; the thunk types the id as number.
        trimmedTournamentId as unknown as number,
        (ids: number[]) => {
          setUserIdsRaw((prev) => parseUserIds(`${prev} ${ids.join(' ')}`).join(', '));
          setStatus('fetched');
        },
        () => setStatus('fetch-error'),
      ),
    );
  };

  const handleSelectAll = () => {
    setUserIdsRaw((prev) => parseUserIds(`${prev} ${allUserIds.join(' ')}`).join(', '));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const target = REDIRECT_ROUTES.find((item) => item.value === route);
    const trimmedId = id.trim();

    if (!target || !trimmedId || userIds.length === 0) return;

    setStatus('sending');
    dispatch(
      broadcastRedirect(
        target.build(trimmedId),
        userIds,
        () => setStatus('sent'),
        () => setStatus('error'),
      ),
    );
  };

  return (
    <Paper
      p="md"
      mb="lg"
      style={{
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
      }}
    >
      <Text fw={700} mb="xs">
        Redirect users
      </Text>

      <Flex wrap="wrap" align="center" gap="xs" mb="xs" component="form" onSubmit={handleFetch}>
        <TextInput
          style={{ maxWidth: '200px' }}
          type="text"
          placeholder="Tournament ID"
          value={tournamentId}
          onChange={(event) => setTournamentId(event.target.value)}
        />
        <Button color="cbSecondary" type="submit" disabled={!tournamentId.trim()}>
          Fetch player IDs
        </Button>
        <Button
          color="cbSecondary"
          type="button"
          disabled={allUserIds.length === 0}
          onClick={handleSelectAll}
        >
          All ({allUserIds.length})
        </Button>
      </Flex>

      <Textarea
        mb="xs"
        rows={2}
        placeholder="User IDs (comma or space separated)"
        value={userIdsRaw}
        onChange={(event) => setUserIdsRaw(event.target.value)}
      />

      <Flex wrap="wrap" align="center" gap="xs" component="form" onSubmit={handleSubmit}>
        <NativeSelect
          style={{ maxWidth: '220px' }}
          data={REDIRECT_ROUTES.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
          value={route}
          onChange={(event) => setRoute(event.currentTarget.value)}
        />
        <TextInput
          style={{ maxWidth: '160px' }}
          type="text"
          placeholder={selectedRoute.placeholder}
          value={id}
          onChange={(event) => setId(event.target.value)}
        />
        <Button type="submit" disabled={!id.trim() || userIds.length === 0}>
          Redirect {userIds.length} users
        </Button>
        {status === 'fetched' && <Text c="green">Fetched</Text>}
        {status === 'fetch-error' && <Text c="red">Tournament not found</Text>}
        {status === 'sent' && <Text c="green">Sent</Text>}
        {status === 'error' && <Text c="red">Failed</Text>}
      </Flex>
    </Paper>
  );
}

function AdminWidget() {
  const isAdmin = useSelector(currentUserIsAdminSelector);
  const { presenceList: rawPresenceList } = useSelector(lobbyDataSelector);
  const presenceList = rawPresenceList as PresenceEntry[];
  const [selected, setSelected] = useState<Connection | null>(null);

  const totalConnections = useMemo(
    () => presenceList.reduce((sum, entry) => sum + (entry.count || 0), 0),
    [presenceList],
  );

  const allUserIds = useMemo(
    () => [...new Set(presenceList.map((entry) => entry.id))],
    [presenceList],
  );

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; userIds: Set<number>; connections: Connection[] }
    >();

    presenceList.forEach((entry) => {
      const name = entry.user?.name || `#${entry.id}`;

      (entry.userPresence || []).forEach((meta, index) => {
        const label = getPageLabel(meta.path);
        const phxRef = meta.phxRef || meta.phx_ref;
        const group = map.get(label) || {
          label,
          userIds: new Set(),
          connections: [],
        };

        group.userIds.add(entry.id);
        group.connections.push({
          key: `${entry.id}-${phxRef || index}`,
          userId: entry.id,
          name,
          label,
          path: meta.path || null,
          state: meta.state || null,
          phxRef: phxRef || null,
          onlineAt: formatOnlineAt(meta.onlineAt),
        });

        map.set(label, group);
      });
    });

    return [...map.values()]
      .map((group) => ({
        label: group.label,
        users: group.userIds.size,
        connections: group.connections.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => b.connections.length - a.connections.length);
  }, [presenceList]);

  if (!isAdmin) {
    return <Box p="md">You must be an admin to view this page.</Box>;
  }

  return (
    <>
      <MainChannelContainer />
      <Flex justify="space-between" align="center" mb="md">
        <Title order={2} m={0}>
          Live connections
        </Title>
        <Text c="dimmed">
          {presenceList.length} users · {totalConnections} connections
        </Text>
      </Flex>
      <RedirectPanel allUserIds={allUserIds} />
      {groups.length === 0 ? (
        <Text ta="center" c="dimmed" py="xl">
          No active connections
        </Text>
      ) : (
        groups.map((group) => (
          <PageSection key={group.label} group={group} onSelect={setSelected} />
        ))
      )}
      <ConnectionModal connection={selected} onHide={() => setSelected(null)} />
    </>
  );
}

export default AdminWidget;
