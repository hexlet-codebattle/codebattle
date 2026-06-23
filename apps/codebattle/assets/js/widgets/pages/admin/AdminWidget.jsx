import { currentUserIsAdminSelector, lobbyDataSelector } from "@/selectors";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Modal from "@/components/BootstrapModal";

import { broadcastRedirect, fetchTournamentPlayerIds } from "../../middlewares/Main";
import MainChannelContainer from "../../components/MainChannelContainer";

const getPageLabel = (path) => {
  if (!path) return "Unknown";
  const p = path.split("?")[0].replace(/\/+$/, "") || "/";

  if (p === "/") return "Lobby";
  if (p === "/maintenance") return "Maintenance";
  if (p === "/waiting") return "Waiting";
  if (p === "/authorized") return "Authorized";

  if (/^\/games\/[^/]+\/threejs$/.test(p)) return "Game 3D";
  if (/^\/games\/[^/]+\/ml$/.test(p)) return "Game ML";
  if (/^\/games(\/|$)/.test(p)) return "Game";

  if (p === "/tasks") return "Tasks";
  if (/^\/tasks\/[^/]+/.test(p)) return "Task";
  if (/^\/task_packs/.test(p)) return "Task Packs";

  if (/^\/tournaments\/[^/]+\/edit$/.test(p)) return "Tournament Edit";
  if (/^\/tournaments\/[^/]+\/stream/.test(p)) return "Tournament Stream";
  if (/^\/tournaments\/[^/]+\/player/.test(p)) return "Tournament Player";
  if (p === "/tournaments") return "Tournaments";
  if (/^\/tournaments\/[^/]+/.test(p)) return "Tournament";

  if (/^\/group_tournaments\/[^/]+\/admin/.test(p)) return "Group Admin";
  if (/^\/group_tournaments/.test(p)) return "Group Tournament";
  if (p === "/my-tournament") return "My Tournament";

  if (p === "/schedule") return "Schedule";
  if (/^\/stream/.test(p)) return "Stream";
  if (p === "/hall_of_fame") return "Hall of Fame";
  if (/^\/h2h\//.test(p)) return "Head to Head";

  if (p === "/seasons") return "Seasons";
  if (/^\/seasons\/[^/]+/.test(p)) return "Season";

  if (p === "/clans") return "Clans";
  if (/^\/clans\/[^/]+/.test(p)) return "Clan";

  if (/^\/e\//.test(p)) return "Event";

  if (p === "/users") return "Rating";
  if (p === "/users/new") return "Sign Up";
  if (/^\/users\/[^/]+/.test(p)) return "Profile";

  if (p === "/settings") return "Settings";
  if (p === "/session/new") return "Sign In";
  if (p === "/remind_password") return "Password";
  if (/^\/feedback/.test(p)) return "Feedback";

  if (/^\/admin\/connections/.test(p)) return "Admin Connections";
  if (/^\/admin/.test(p)) return "Admin";

  if (/^\/cssbattle/.test(p)) return "CSS Battle";
  if (/^\/broadcast-editor/.test(p)) return "Broadcast";

  return p;
};

const labelColor = (label) => {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) {
    h = (h * 31 + label.charCodeAt(i)) % 360;
  }
  return `hsl(${h}, 70%, 62%)`;
};

const formatOnlineAt = (onlineAt) => {
  const seconds = Number(onlineAt);
  if (!seconds) return null;
  return new Date(seconds * 1000).toLocaleTimeString();
};

const dotStyle = (color) => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: color,
  boxShadow: `0 0 6px ${color}`,
  flexShrink: 0,
});

const userCardStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  maxWidth: "220px",
  minWidth: 0,
  padding: "6px 10px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  fontSize: "13px",
  cursor: "pointer",
};

function UserCard({ connection, onSelect }) {
  const handleSelect = () => onSelect(connection);

  return (
    <div
      role="button"
      tabIndex={0}
      style={userCardStyle}
      onClick={handleSelect}
      onKeyPress={handleSelect}
    >
      <i className="fas fa-user text-muted" style={{ fontSize: "11px" }} />
      <span className="text-truncate" style={{ fontWeight: 600 }}>
        {connection.name}
      </span>
    </div>
  );
}

function PageSection({ group, onSelect }) {
  const color = labelColor(group.label);

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center mb-2" style={{ gap: "8px" }}>
        <span style={dotStyle(color)} />
        <span style={{ fontWeight: 700 }}>{group.label}</span>
        <span className="text-muted" style={{ fontSize: "12px" }}>
          {group.users} · {group.connections.length}
        </span>
      </div>
      <div className="d-flex flex-wrap" style={{ gap: "8px" }}>
        {group.connections.map((connection) => (
          <UserCard key={connection.key} connection={connection} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function ConnectionRow({ label, value }) {
  return (
    <div className="d-flex" style={{ gap: "12px", padding: "4px 0" }}>
      <span className="text-muted" style={{ minWidth: "110px", flexShrink: 0 }}>
        {label}
      </span>
      <span className="text-break" style={{ fontFamily: "monospace" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function ConnectionModal({ connection, onHide }) {
  return (
    <Modal contentClassName="cb-bg-panel cb-text" show={!!connection} onHide={onHide}>
      <Modal.Header className="cb-border-color" closeButton>
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
    label: "Group Tournament",
    value: "group_tournaments",
    build: (id) => `/group_tournaments/${id}`,
  },
];

const parseUserIds = (raw) =>
  [...new Set((raw.match(/\d+/g) || []).map(Number))];

function RedirectPanel() {
  const dispatch = useDispatch();
  const [route, setRoute] = useState(REDIRECT_ROUTES[0].value);
  const [id, setId] = useState("");
  const [userIdsRaw, setUserIdsRaw] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [status, setStatus] = useState(null);

  const userIds = useMemo(() => parseUserIds(userIdsRaw), [userIdsRaw]);

  const handleFetch = (event) => {
    event.preventDefault();

    const trimmedTournamentId = tournamentId.trim();
    if (!trimmedTournamentId) return;

    setStatus("fetching");
    dispatch(
      fetchTournamentPlayerIds(
        trimmedTournamentId,
        (ids) => {
          setUserIdsRaw((prev) => parseUserIds(`${prev} ${ids.join(" ")}`).join(", "));
          setStatus("fetched");
        },
        () => setStatus("fetch-error"),
      ),
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const target = REDIRECT_ROUTES.find((item) => item.value === route);
    const trimmedId = id.trim();

    if (!target || !trimmedId || userIds.length === 0) return;

    setStatus("sending");
    dispatch(
      broadcastRedirect(
        target.build(trimmedId),
        userIds,
        () => setStatus("sent"),
        () => setStatus("error"),
      ),
    );
  };

  return (
    <div
      className="mb-4 p-3"
      style={{
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
      }}
    >
      <div className="mb-2" style={{ fontWeight: 700 }}>
        Redirect users
      </div>

      <form className="d-flex flex-wrap align-items-center mb-2" style={{ gap: "8px" }} onSubmit={handleFetch}>
        <input
          className="form-control"
          style={{ maxWidth: "200px" }}
          type="text"
          placeholder="Tournament ID"
          value={tournamentId}
          onChange={(event) => setTournamentId(event.target.value)}
        />
        <button className="btn btn-secondary" type="submit" disabled={!tournamentId.trim()}>
          Fetch player IDs
        </button>
      </form>

      <textarea
        className="form-control mb-2"
        rows={2}
        placeholder="User IDs (comma or space separated)"
        value={userIdsRaw}
        onChange={(event) => setUserIdsRaw(event.target.value)}
      />

      <form className="d-flex flex-wrap align-items-center" style={{ gap: "8px" }} onSubmit={handleSubmit}>
        <select
          className="form-control"
          style={{ maxWidth: "220px" }}
          value={route}
          onChange={(event) => setRoute(event.target.value)}
        >
          {REDIRECT_ROUTES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          className="form-control"
          style={{ maxWidth: "160px" }}
          type="text"
          placeholder="ID"
          value={id}
          onChange={(event) => setId(event.target.value)}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!id.trim() || userIds.length === 0}
        >
          Redirect {userIds.length} users
        </button>
        {status === "fetched" && <span className="text-success">Fetched</span>}
        {status === "fetch-error" && <span className="text-danger">Tournament not found</span>}
        {status === "sent" && <span className="text-success">Sent</span>}
        {status === "error" && <span className="text-danger">Failed</span>}
      </form>
    </div>
  );
}

function AdminWidget() {
  const isAdmin = useSelector(currentUserIsAdminSelector);
  const { presenceList } = useSelector(lobbyDataSelector);
  const [selected, setSelected] = useState(null);

  const totalConnections = useMemo(
    () => presenceList.reduce((sum, entry) => sum + (entry.count || 0), 0),
    [presenceList],
  );

  const groups = useMemo(() => {
    const map = new Map();

    presenceList.forEach((entry) => {
      const name = entry.user?.name || `#${entry.id}`;

      (entry.userPresence || []).forEach((meta, index) => {
        const label = getPageLabel(meta.path);
        const phxRef = meta.phxRef || meta.phx_ref;
        const group = map.get(label) || { label, userIds: new Set(), connections: [] };

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
    return <div className="p-3">You must be an admin to view this page.</div>;
  }

  return (
    <>
      <MainChannelContainer />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Live connections</h2>
        <div className="text-muted">
          {presenceList.length} users · {totalConnections} connections
        </div>
      </div>
      <RedirectPanel />
      {groups.length === 0 ? (
        <div className="text-center text-muted py-5">No active connections</div>
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
