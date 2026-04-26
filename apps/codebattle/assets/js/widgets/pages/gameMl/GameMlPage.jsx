import React, { useMemo } from "react";

import Gon from "gon";
import { camelizeKeys } from "humps";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PLAYER_COLORS = ["#60a5fa", "#f472b6"];

const RISK_BADGE = {
  none: { label: "Looks human", className: "badge badge-success" },
  low: { label: "Low risk", className: "badge badge-info" },
  medium: { label: "Suspicious", className: "badge badge-warning" },
  high: { label: "Likely bot", className: "badge badge-danger" },
};

const formatMs = (ms) => {
  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

const formatNumber = (n) => (Number.isFinite(n) ? n.toLocaleString() : "—");

function StatRow({ label, value, hint }) {
  return (
    <div className="d-flex justify-content-between py-1 border-bottom border-secondary">
      <span className="text-muted small">{label}</span>
      <span className="text-white text-monospace">
        {value}
        {hint ? <span className="text-muted small ml-2">{hint}</span> : null}
      </span>
    </div>
  );
}

function PlayerCard({ player, batches, color }) {
  const report = player?.report || null;
  const stats = report?.stats || null;
  const codeAnalysis = report?.codeAnalysis || null;
  const finalText = player?.editorText || "";
  const finalLength = report?.finalLength ?? finalText.length;
  const templateLength = report?.templateLength ?? 0;
  const effectiveAddedLength = report?.effectiveAddedLength ?? 0;
  const score = report?.score ?? 0;
  const level = report?.level || "none";
  const signals = report?.signals || [];
  const badge = RISK_BADGE[level] || RISK_BADGE.none;

  // Per-batch series for charts (raw batches, not aggregated).
  const series = useMemo(
    () =>
      batches.map((b, idx) => ({
        idx: idx + 1,
        startSec: Math.round((b.windowStartOffsetMs || 0) / 1000),
        events: b.eventCount,
        chars: (b.summary?.charsInserted || 0) - (b.summary?.charsDeleted || 0),
        avgKeyDeltaMs: b.summary?.avgKeyDeltaMs || 0,
      })),
    [batches],
  );

  return (
    <div
      className="card cb-card border cb-border-color rounded shadow-sm mb-3"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="card-header py-2 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          {player?.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={player.name}
              width={28}
              height={28}
              className="rounded-circle mr-2"
            />
          ) : null}
          <div>
            <h6 className="cb-text mb-0">
              {player?.name || `User #${player?.id}`}
              {player?.isBot ? <span className="badge badge-secondary ml-2">bot</span> : null}
            </h6>
            <small className="text-muted">
              id={player?.id} · rating={player?.rating ?? "—"} · lang={player?.lang ?? "—"}
            </small>
          </div>
        </div>
        <div className="d-flex align-items-center">
          <span className={`${badge.className} mr-2`}>{badge.label}</span>
          <span className="text-muted small">score {score}</span>
        </div>
      </div>

      <div className="card-body">
        {!stats && (
          <div className="alert alert-warning py-2 mb-3">
            <strong>No telemetry batches recorded.</strong> Either the player never typed, or their
            solution was injected via WebSocket without using the editor.
          </div>
        )}

        {codeAnalysis && (
          <div className="row mb-3">
            <div className="col-md-6">
              <small className="text-muted">Final solution analysis</small>
              <StatRow
                label="Total chars / lines"
                value={`${codeAnalysis.totalChars} / ${codeAnalysis.totalLines}`}
              />
              <StatRow
                label="Code lines / comment lines"
                value={`${codeAnalysis.codeLines} / ${codeAnalysis.commentLines}`}
              />
              <StatRow
                label="Comment-to-code ratio"
                value={(codeAnalysis.commentToCodeRatio || 0).toFixed(2)}
              />
              <StatRow
                label="Long comment lines (>40 chars)"
                value={codeAnalysis.longCommentLines || 0}
              />
              <StatRow
                label="GPT-style phrase hits"
                value={codeAnalysis.gptPhraseHits || 0}
                hint={
                  codeAnalysis.gptPhraseMatches?.length > 0
                    ? `“${codeAnalysis.gptPhraseMatches.slice(0, 2).join("”, “")}”${
                        codeAnalysis.gptPhraseMatches.length > 2 ? ", …" : ""
                      }`
                    : null
                }
              />
            </div>
            <div className="col-md-6">
              <small className="text-muted">Typed vs final</small>
              <StatRow label="Final solution length" value={formatNumber(finalLength)} />
              <StatRow
                label="Language template length"
                value={formatNumber(templateLength)}
                hint="excluded from coverage"
              />
              <StatRow label="Effective added length" value={formatNumber(effectiveAddedLength)} />
              <StatRow
                label="Total chars typed"
                value={formatNumber(stats?.totalCharsInserted || 0)}
              />
              <StatRow
                label="Typed coverage"
                value={
                  effectiveAddedLength > 0
                    ? `${(((stats?.totalCharsInserted || 0) / effectiveAddedLength) * 100).toFixed(0)}%`
                    : "—"
                }
                hint={
                  effectiveAddedLength >= 60 &&
                  (stats?.totalCharsInserted || 0) / effectiveAddedLength < 0.6
                    ? "low → likely injected/pasted"
                    : null
                }
              />
            </div>
          </div>
        )}

        {signals.length > 0 && (
          <div className="alert alert-secondary py-2 mb-3">
            <strong>Signals:</strong>
            <ul className="mb-0 mt-1 small">
              {signals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {finalText && (
          <details className="mb-3">
            <summary className="text-muted small" style={{ cursor: "pointer" }}>
              Show final submitted code ({finalLength} chars, lang={player?.editorLang || "?"})
            </summary>
            <pre
              className="mt-2 p-2 small text-white"
              style={{
                background: "#0b1220",
                border: "1px solid #3a3f50",
                borderRadius: 4,
                maxHeight: 360,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {finalText}
            </pre>
          </details>
        )}

        {stats && (
          <>
            <div className="row">
              <div className="col-md-6">
                <StatRow label="Batches" value={formatNumber(stats.batchCount)} />
                <StatRow
                  label="Total events"
                  value={formatNumber(stats.totalEvents)}
                  hint={`${(stats.eventsPerSec || 0).toFixed(2)}/s`}
                />
                <StatRow label="Key events" value={formatNumber(stats.totalKeyEvents)} />
                <StatRow label="Printable keys" value={formatNumber(stats.totalPrintableKeys)} />
                <StatRow
                  label="Chars inserted / deleted"
                  value={`${formatNumber(stats.totalCharsInserted)} / ${formatNumber(
                    stats.totalCharsDeleted,
                  )}`}
                  hint={`${(stats.charsPerSec || 0).toFixed(2)} ins/s`}
                />
                <StatRow label="Net Δ text" value={formatNumber(stats.totalNetTextDelta)} />
                <StatRow
                  label="Backspace / Delete"
                  value={`${stats.totalBackspace} / ${stats.totalDelete}`}
                />
                <StatRow label="Arrow keys" value={formatNumber(stats.totalArrows)} />
                <StatRow label="Undo / Redo" value={`${stats.totalUndo} / ${stats.totalRedo}`} />
              </div>
              <div className="col-md-6">
                <StatRow label="Session length" value={formatMs(stats.elapsedMs)} />
                <StatRow label="Avg key delta" value={formatMs(stats.avgKeyDeltaMs)} />
                <StatRow
                  label="Min / Max key delta"
                  value={`${formatMs(stats.minKeyDeltaMs)} / ${formatMs(stats.maxKeyDeltaMs)}`}
                />
                <StatRow label="Idle pauses >2s" value={formatNumber(stats.totalIdlePauses)} />
                <StatRow
                  label="Multi-char inserts / deletes"
                  value={`${stats.totalMultiCharInserts} / ${stats.totalMultiCharDeletes}`}
                />
                <StatRow
                  label="Multi-line inserts"
                  value={formatNumber(stats.totalMultiLineInserts)}
                />
                <StatRow
                  label="Largest single insert / delete"
                  value={`${stats.maxSingleInsertLen} / ${stats.maxSingleDeleteLen}`}
                  hint={stats.maxSingleInsertLen >= 8 ? "≥8 → likely paste" : null}
                />
                <StatRow
                  label="Large inserts (≥50)"
                  value={formatNumber(stats.totalLargeInserts)}
                />
                <StatRow
                  label="Content changes / printable keys"
                  value={`${stats.totalContentChanges} / ${stats.totalPrintableKeys}`}
                  hint={
                    stats.totalContentChanges > stats.totalPrintableKeys + 1
                      ? "more changes than keys → programmatic"
                      : null
                  }
                />
                <StatRow
                  label="Copy / Cut / Paste shortcuts"
                  value={`${stats.totalCopyShortcuts || 0} / ${stats.totalCutShortcuts || 0} / ${stats.totalPasteAttempts}`}
                />
                <StatRow label="Paste blocked" value={formatNumber(stats.totalPasteBlocked)} />
              </div>
            </div>

            <div className="row mt-4">
              <div className="col-md-6" style={{ height: 220 }}>
                <small className="text-muted">Events &amp; net chars per batch</small>
                <ResponsiveContainer>
                  <BarChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#3a3f50" strokeDasharray="3 3" />
                    <XAxis dataKey="startSec" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#1f2937", border: "1px solid #3a3f50" }}
                      labelStyle={{ color: "#e5e7eb" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="events" fill={color} name="events" />
                    <Bar dataKey="chars" fill="#a78bfa" name="net Δ chars" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="col-md-6" style={{ height: 220 }}>
                <small className="text-muted">Avg key delta (ms) per batch</small>
                <ResponsiveContainer>
                  <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#3a3f50" strokeDasharray="3 3" />
                    <XAxis dataKey="startSec" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#1f2937", border: "1px solid #3a3f50" }}
                      labelStyle={{ color: "#e5e7eb" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgKeyDeltaMs"
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GameMlPage() {
  const gameId = Gon.getAsset("game_id");
  const players = (Gon.getAsset("players") || []).map((p) => camelizeKeys(p));
  const batches = (Gon.getAsset("batches") || []).map((b) => camelizeKeys(b));

  const batchesByUser = useMemo(() => {
    const map = new Map();
    batches.forEach((b) => {
      const list = map.get(b.userId) || [];
      list.push(b);
      map.set(b.userId, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => (a.windowStartOffsetMs || 0) - (b.windowStartOffsetMs || 0)),
    );
    return map;
  }, [batches]);

  return (
    <div
      className="container-fluid py-3 cb-text"
      style={{ background: "#0f172a", minHeight: "100vh" }}
    >
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Game #{gameId} — bot/human signal review</h4>
        <div>
          <a className="btn btn-sm btn-outline-info mr-2" href={`?refresh=1`}>
            ↻ Re-analyze
          </a>
          <a className="btn btn-sm btn-outline-light" href={`/games/${gameId}`}>
            ← Back to game
          </a>
        </div>
      </div>

      <p className="text-muted small">
        Higher risk score / more signals → more bot-like. Always confirm by playing back the editor
        history. Reports are computed once and cached; click <em>Re-analyze</em> to force a fresh
        run.
      </p>

      {players.length === 0 ? (
        <div className="alert alert-warning">No players found for this game.</div>
      ) : (
        players.map((player, idx) => (
          <PlayerCard
            key={player.id}
            player={player}
            batches={batchesByUser.get(player.id) || []}
            color={PLAYER_COLORS[idx % PLAYER_COLORS.length]}
          />
        ))
      )}
    </div>
  );
}

export default GameMlPage;
