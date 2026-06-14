import React, { memo, useEffect, useMemo, useState } from "react";

import Gon from "gon";

import socket from "../../../socket";

const WIDGETS = [
  { key: "leftEditor", label: "Left editor", params: "font_size=24&editor_theme=cb-stream" },
  { key: "rightEditor", label: "Right editor", params: "font_size=24&editor_theme=cb-stream" },
  { key: "timer", label: "Timer", params: "" },
  { key: "task", label: "Task", params: "font_size=22" },
  { key: "examples", label: "Examples", params: "font_size=20" },
  { key: "leftTests", label: "Left tests", params: "" },
  { key: "rightTests", label: "Right tests", params: "" },
];

const MATCH_STATE_ORDER = ["playing", "pending", "game_over", "timeout", "canceled", "finished"];

const matchSorter = (a, b) => {
  const ai = MATCH_STATE_ORDER.indexOf(a.state);
  const bi = MATCH_STATE_ORDER.indexOf(b.state);
  if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  return (a.id || 0) - (b.id || 0);
};

const stateColor = (state) => {
  switch (state) {
    case "playing":
      return "#22c55e";
    case "pending":
      return "#94a3b8";
    case "timeout":
      return "#f59e0b";
    case "canceled":
      return "#64748b";
    default:
      return "#a4aab3";
  }
};

function StreamLinksPanel({ tournamentId }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = `${origin}/tournaments/${tournamentId}/stream?fullscreen=true`;

  const copy = (url) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-header py-2">
        <strong>OBS / stream URLs</strong>
      </div>
      <ul className="list-group list-group-flush">
        {WIDGETS.map((w) => {
          const url = `${base}&widget=${w.key}${w.params ? `&${w.params}` : ""}`;
          return (
            <li
              key={w.key}
              className="list-group-item d-flex align-items-center justify-content-between"
            >
              <div className="text-truncate mr-2" style={{ minWidth: 0 }}>
                <strong className="mr-2">{w.label}</strong>
                <code className="text-muted" style={{ fontSize: "12px" }}>
                  {url}
                </code>
              </div>
              <div className="flex-shrink-0">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-primary mr-2"
                >
                  Open
                </a>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => copy(url)}
                >
                  Copy
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MatchRow({ match, playersById, isActive, onSetActive, disabled }) {
  const players = (match.player_ids || []).map(
    (id) =>
      playersById[id] || {
        id,
        name: `#${id}`,
      },
  );

  return (
    <li
      className="list-group-item d-flex align-items-center justify-content-between"
      style={{
        background: isActive ? "rgba(34,197,94,0.12)" : undefined,
        borderLeft: isActive ? "4px solid #22c55e" : "4px solid transparent",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="d-flex align-items-center" style={{ gap: 10 }}>
          <span
            className="badge text-uppercase"
            style={{
              background: stateColor(match.state),
              color: "#0b1220",
              fontWeight: 700,
            }}
          >
            {match.state}
          </span>
          <span style={{ fontFamily: "Menlo, Monaco, Consolas, monospace", fontSize: 13 }}>
            round {match.round_id ?? match.round_position ?? "?"} · match #{match.id}
          </span>
          {match.game_id ? (
            <span className="text-muted" style={{ fontSize: 12 }}>
              game #{match.game_id}
            </span>
          ) : null}
        </div>
        <div className="mt-1" style={{ fontSize: 15 }}>
          {players.length ? (
            players.map((p, i) => (
              <span key={p.id}>
                {i > 0 ? <span className="text-muted mx-2">vs</span> : null}
                <strong>{p.name}</strong>
                {p.lang || p.editor_lang ? (
                  <span className="text-muted ml-1" style={{ fontSize: 12 }}>
                    [{p.lang || p.editor_lang}]
                  </span>
                ) : null}
              </span>
            ))
          ) : (
            <span className="text-muted">no players</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 d-flex align-items-center" style={{ gap: 6 }}>
        {match.game_id ? (
          <a
            href={`/games/${match.game_id}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-outline-secondary"
          >
            Game
          </a>
        ) : null}
        <button
          type="button"
          className={`btn btn-sm ${isActive ? "btn-success" : "btn-outline-success"}`}
          onClick={() => onSetActive(match.game_id)}
          disabled={disabled || !match.game_id}
          title={!match.game_id ? "match has no game yet" : "show on stream"}
        >
          {isActive ? "✓ Live" : "Set Live"}
        </button>
      </div>
    </li>
  );
}

function TournamentStreamAdminPage() {
  const tournamentId = Gon.getAsset("tournament_id");
  const tournamentName = Gon.getAsset("tournament_name") || `Tournament #${tournamentId}`;

  const [matches, setMatches] = useState({});
  const [playersById, setPlayersById] = useState({});
  const [activeGameId, setActiveGameId] = useState(null);
  const [channel, setChannel] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [filter, setFilter] = useState("playing");

  useEffect(() => {
    if (!tournamentId) return () => {};

    const ch = socket.channel(`tournament_admin:${tournamentId}`, {});
    setChannel(ch);

    const mergePlayers = (list = []) => {
      if (!list.length) return;
      setPlayersById((prev) => {
        const next = { ...prev };
        list.forEach((p) => {
          if (p && p.id != null) next[p.id] = { ...next[p.id], ...p };
        });
        return next;
      });
    };

    const upsertMatches = (list = []) => {
      if (!list.length) return;
      setMatches((prev) => {
        const next = { ...prev };
        list.forEach((m) => {
          if (m && m.id != null) next[m.id] = { ...next[m.id], ...m };
        });
        return next;
      });
    };

    const refs = [];

    refs.push(
      ch.on("tournament:match:upserted", (payload) => {
        if (payload?.match) upsertMatches([payload.match]);
        if (payload?.players) mergePlayers(payload.players);
      }),
    );

    refs.push(
      ch.on("tournament:stream:active_game", (payload) => {
        if (payload && "game_id" in payload) {
          setActiveGameId(payload.game_id || null);
        }
      }),
    );

    refs.push(
      ch.on("tournament:round_created", () => {
        setMatches({});
      }),
    );

    ch.join()
      .receive("ok", (resp) => {
        setStatus("connected");
        upsertMatches(resp?.matches || []);
        mergePlayers(resp?.players || []);
        if (resp?.active_game_id) setActiveGameId(resp.active_game_id);
      })
      .receive("error", (err) => {
        console.error("admin join error", err);
        setStatus("error");
      });

    return () => {
      refs.forEach((ref, i) => {
        const events = [
          "tournament:match:upserted",
          "tournament:stream:active_game",
          "tournament:round_created",
        ];
        ch.off(events[i], ref);
      });
      ch.leave();
    };
  }, [tournamentId]);

  const matchList = useMemo(() => {
    const arr = Object.values(matches);
    arr.sort(matchSorter);
    if (filter === "all") return arr;
    if (filter === "playing") return arr.filter((m) => m.state === "playing");
    if (filter === "live") {
      return arr.filter((m) => m.state === "playing" || m.game_id === activeGameId);
    }
    return arr;
  }, [matches, filter, activeGameId]);

  const setActive = (gameId) => {
    if (!channel || !gameId) return;
    setActiveGameId(gameId);
    channel
      .push("tournament:stream:active_game", { game_id: gameId, gameId })
      .receive("error", (err) => console.error("set active error", err));
  };

  const clearActive = () => {
    if (!channel) return;
    setActiveGameId(null);
    channel
      .push("tournament:stream:active_game", { game_id: null, gameId: null })
      .receive("error", (err) => console.error("clear active error", err));
  };

  const playingCount = matchList.filter((m) => m.state === "playing").length;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h3 className="mb-0">Stream Admin · {tournamentName}</h3>
          <small className="text-muted">
            Status: {status} · playing matches: {playingCount} · active game:{" "}
            {activeGameId ? `#${activeGameId}` : "—"}
          </small>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <a
            className="btn btn-sm btn-outline-primary"
            href={`/tournaments/${tournamentId}/stream?fullscreen=true`}
            target="_blank"
            rel="noreferrer"
          >
            Open full stream
          </a>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={clearActive}>
            Clear active
          </button>
        </div>
      </div>

      <StreamLinksPanel tournamentId={tournamentId} />

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between py-2">
          <strong>Matches</strong>
          <div className="btn-group btn-group-sm" role="group">
            {[
              ["playing", "Playing"],
              ["live", "Live + Active"],
              ["all", "All"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn ${filter === key ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {matchList.length === 0 ? (
          <div className="card-body text-center text-muted py-4">No matches to show.</div>
        ) : (
          <ul className="list-group list-group-flush">
            {matchList.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                playersById={playersById}
                isActive={m.game_id && m.game_id === activeGameId}
                onSetActive={setActive}
                disabled={status !== "connected"}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default memo(TournamentStreamAdminPage);
