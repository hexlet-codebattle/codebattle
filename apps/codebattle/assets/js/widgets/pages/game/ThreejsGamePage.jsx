import React, { memo, useEffect, useRef, useState } from "react";

import MonacoEditor from "@monaco-editor/react";
import Gon from "gon";
import i18next from "i18next";

import "../../initEditor";
import socket from "../../../socket";
import languages from "../../config/languages";
import TaskDescriptionMarkdown from "./TaskDescriptionMarkdown";

const loadThree = async () => {
  const threeUrl = "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
  return import(/* @vite-ignore */ threeUrl);
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const brand = {
  gold: "#e0bf7a",
  silver: "#c2c9d6",
  bronze: "#c48a57",
  platinum: "#a4aab3",
  steel: "#8a919c",
  red: "#ef4444",
  cyan: "#38bdf8",
};

const editorThemes = [
  {
    frame: brand.gold,
    header: brand.silver,
  },
  {
    frame: brand.platinum,
    header: brand.steel,
  },
];

const getPlayerId = (player) => player?.id;
const getPlayerName = (player) => player?.name || "Unknown";
const getPlayerLang = (player) => player?.editorLang || player?.editor_lang || "js";
const getPlayerText = (player) => player?.editorText || player?.editor_text || "";

const normalizePlayer = (player, fallback = {}) => {
  const editorText = getPlayerText(player) || getPlayerText(fallback);
  const editorLang = getPlayerLang(player) || getPlayerLang(fallback);

  return {
    ...fallback,
    ...player,
    editorText,
    editorLang,
  };
};

const normalizePlayers = (players = [], prevPlayers = []) => {
  const prevById = prevPlayers.reduce(
    (acc, player) => ({ ...acc, [getPlayerId(player)]: player }),
    {},
  );

  return players.map((player) => {
    const id = getPlayerId(player);
    return normalizePlayer(player, prevById[id]);
  });
};

const updatePlayerEditorData = (players, userId, editorText, editorLang) =>
  players.map((player) => {
    if (String(getPlayerId(player)) !== String(userId)) {
      return player;
    }

    return {
      ...player,
      editorText,
      editorLang: editorLang || player.editorLang,
    };
  });

const pickPlayers = (payload = {}) => {
  if (Array.isArray(payload.players)) {
    return payload.players;
  }

  if (payload.game && Array.isArray(payload.game.players)) {
    return payload.game.players;
  }

  return null;
};

const stateFromPayload = (payload = {}) =>
  payload.state || payload.game_state || payload.gameState || null;

const getTypingIntensity = (typingMeta, now) => {
  if (!typingMeta?.lastPulseAt) {
    return 0;
  }

  const age = now - typingMeta.lastPulseAt;
  const decay = clamp(1 - age / 1300, 0, 1);
  const base = clamp((typingMeta.speed || 0) / 14, 0, 1);

  return clamp(base * decay, 0, 1);
};

const getOutcomeIds = (players = []) => {
  const winner = players.find((p) => p?.result === "won");
  const loser = players.find((p) => p?.result === "lost" || p?.result === "gave_up");

  return {
    winnerId: winner?.id || null,
    loserId: loser?.id || null,
  };
};

const parseTestProgress = (payload = {}) => {
  const checkResult = payload.check_result || payload.checkResult || {};

  const successCount =
    checkResult.success_count || checkResult.successCount || checkResult.success || 0;
  const assertsCount =
    checkResult.asserts_count ||
    checkResult.assertsCount ||
    (Array.isArray(checkResult.asserts) ? checkResult.asserts.length : 0) ||
    0;

  const status = checkResult.status || "initial";
  const output = checkResult.output || "";
  const outputError = checkResult.output_error || checkResult.outputError || "";
  const asserts = Array.isArray(checkResult.asserts) ? checkResult.asserts : [];
  const failedAssert = asserts.find((a) => a && a.status && a.status !== "success");

  return {
    successCount,
    assertsCount,
    status,
    output,
    outputError,
    failedAssert,
  };
};

const getEditorBorderState = ({
  isChecking,
  isWinner,
  isLoser,
  typingIntensity,
  checkPulse,
  winPulse,
  lossPulse,
  base,
}) => {
  if (isWinner && winPulse > 0.01) {
    return {
      color: brand.gold,
      alpha: clamp(0.35 + winPulse * 0.65, 0, 1),
      width: 3,
    };
  }

  if (isLoser && lossPulse > 0.01) {
    return {
      color: brand.bronze,
      alpha: clamp(0.3 + lossPulse * 0.65, 0, 1),
      width: 3,
    };
  }

  if (isChecking) {
    return {
      color: brand.silver,
      alpha: clamp(0.3 + checkPulse * 0.7, 0, 1),
      width: 3,
    };
  }

  return {
    color: base,
    alpha: clamp(0.3 + typingIntensity * 0.6, 0.3, 0.9),
    width: 2,
  };
};

const baseEditorOptions = {
  minimap: { enabled: false },
  readOnly: true,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  lineNumbers: "on",
  wordWrap: "off",
  renderWhitespace: "none",
  contextmenu: false,
};

const DEFAULT_FONT_SIZE = 22;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 64;

const STORAGE_KEY = "codebattle:threejs:preset:v1";

const loadPreset = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
};

const savePreset = (preset) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
  } catch (_e) {
    // ignore
  }
};

const clearPreset = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (_e) {
    // ignore
  }
};

const initialGame = Gon.getAsset("game") || {};

const computeDefaultLayouts = (stage) => {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const pad = 12;
  const gap = 10;
  const colW = (w - pad * 2 - gap) / 2;
  const timerW = 200;
  const examplesW = colW - timerW - gap;

  const topRowH = Math.round(h * 0.35);
  const testsH = Math.round(h * 0.13);

  const editorY = pad + topRowH + gap;
  const testsY = h - pad - testsH;
  const editorH = testsY - gap - editorY;

  return {
    task: { x: pad, y: pad, width: colW, height: topRowH },
    examples: { x: pad + colW + gap, y: pad, width: examplesW, height: topRowH },
    timer: { x: pad + colW + gap + examplesW + gap, y: pad, width: timerW, height: topRowH },
    leftEditor: { x: pad, y: editorY, width: colW, height: editorH },
    rightEditor: { x: pad + colW + gap, y: editorY, width: colW, height: editorH },
    leftTests: { x: pad, y: testsY, width: colW, height: testsH },
    rightTests: { x: pad + colW + gap, y: testsY, width: colW, height: testsH },
  };
};

function fontButtonStyle(accent) {
  return {
    background: "transparent",
    color: "#fff",
    border: `1px solid ${accent}`,
    width: "28px",
    height: "28px",
    borderRadius: "4px",
    fontWeight: 700,
    fontFamily: "Menlo, Monaco, Consolas, monospace",
    cursor: "pointer",
    lineHeight: 1,
  };
}

function Pane({
  title,
  accent,
  border,
  layout,
  zIndex,
  fontSize,
  onIncreaseFont,
  onDecreaseFont,
  onDragStart,
  onResizeStart,
  onBringToFront,
  bodyStyle,
  children,
  editMode = true,
  showHeader = true,
  onToggleHeader,
}) {
  if (!layout) return null;

  const wrapperStyle = {
    border: border ? `${border.width}px solid ${border.color}` : `2px solid ${accent}`,
    boxShadow: border
      ? `0 0 28px rgba(224, 191, 122, ${border.alpha})`
      : "0 0 18px rgba(0,0,0,0.6)",
    background: "#090d16",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "absolute",
    left: `${layout.x}px`,
    top: `${layout.y}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    zIndex,
  };

  return (
    <div style={wrapperStyle} onMouseDown={onBringToFront} role="presentation">
      {showHeader && (
        <div
          role="presentation"
          onMouseDown={editMode ? onDragStart : undefined}
          style={{
            background: "#060a12",
            color: "#fff",
            fontFamily: "Menlo, Monaco, Consolas, monospace",
            fontWeight: 700,
            fontSize: "18px",
            padding: "8px 12px",
            borderBottom: `2px solid ${accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            cursor: editMode ? "move" : "default",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </span>
          {editMode && (
            <div
              role="presentation"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {typeof fontSize === "number" && (
                <>
                  <button
                    type="button"
                    style={fontButtonStyle(accent)}
                    onClick={onDecreaseFont}
                    aria-label="Decrease font size"
                  >
                    −
                  </button>
                  <span style={{ fontSize: "14px", minWidth: "28px", textAlign: "center" }}>
                    {fontSize}
                  </span>
                  <button
                    type="button"
                    style={fontButtonStyle(accent)}
                    onClick={onIncreaseFont}
                    aria-label="Increase font size"
                  >
                    +
                  </button>
                </>
              )}
              {onToggleHeader && (
                <button
                  type="button"
                  style={fontButtonStyle(accent)}
                  onClick={onToggleHeader}
                  title="Hide header"
                  aria-label="Hide header"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {!showHeader && editMode && (
        <>
          <div
            role="presentation"
            onMouseDown={onDragStart}
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              right: 36,
              height: 16,
              cursor: "move",
              zIndex: 4,
              background: `linear-gradient(180deg, ${accent}55, transparent)`,
              borderRadius: "6px",
            }}
          />
          {onToggleHeader && (
            <button
              type="button"
              onClick={onToggleHeader}
              title="Show header"
              aria-label="Show header"
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 24,
                height: 16,
                lineHeight: "14px",
                padding: 0,
                fontSize: "12px",
                cursor: "pointer",
                zIndex: 5,
                background: "rgba(6,10,18,0.85)",
                color: "#fff",
                border: `1px solid ${accent}`,
                borderRadius: "4px",
              }}
            >
              ▾
            </button>
          )}
        </>
      )}
      <div style={{ flexGrow: 1, minHeight: 0, ...bodyStyle }}>{children}</div>
      {editMode && (
        <div
          role="presentation"
          onMouseDown={onResizeStart}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: "20px",
            height: "20px",
            cursor: "nwse-resize",
            background: `linear-gradient(135deg, transparent 50%, ${accent} 50%)`,
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
}

function EditorBody({ player, fontSize, onMount }) {
  const language = languages[getPlayerLang(player)] || "javascript";
  return (
    <MonacoEditor
      theme="vs-dark"
      language={language}
      value={getPlayerText(player)}
      height="100%"
      options={{ ...baseEditorOptions, fontSize }}
      onMount={onMount}
    />
  );
}

function TestsBody({ tests, accent }) {
  const total = tests?.assertsCount || 0;
  const success = tests?.successCount || 0;
  const percent = total > 0 ? clamp((success / total) * 100, 0, 100) : 0;
  const status = tests?.status || "initial";
  const isError = [
    "error",
    "memory_leak",
    "timeout",
    "service_failure",
    "service_timeout",
    "client_timeout",
  ].includes(status);
  const isFailure = status === "failure";
  const isOk = status === "ok";

  let statusLabel = "Waiting";
  let statusColor = "#94a3b8";
  if (isOk) {
    statusLabel = "All tests passed";
    statusColor = "#22c55e";
  } else if (isFailure) {
    statusLabel = `${total - success} test${total - success === 1 ? "" : "s"} failed`;
    statusColor = brand.red;
  } else if (status === "error") {
    statusLabel = "Compilation / runtime error";
    statusColor = brand.red;
  } else if (status === "timeout" || status === "client_timeout" || status === "service_timeout") {
    statusLabel = "Execution timed out";
    statusColor = "#f59e0b";
  } else if (status === "memory_leak") {
    statusLabel = "Memory limit exceeded";
    statusColor = "#f59e0b";
  } else if (status === "service_failure") {
    statusLabel = "Service failure";
    statusColor = brand.red;
  }

  const errorText = tests?.outputError || tests?.output || "";
  const failedAssert = tests?.failedAssert;

  return (
    <div
      style={{
        background: "#060a12",
        padding: "12px 14px",
        fontFamily: "Menlo, Monaco, Consolas, monospace",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div style={{ color: "#fff", fontSize: "20px", fontWeight: 700 }}>
          {`${success}/${total}`}
        </div>
        <div
          style={{
            color: statusColor,
            fontSize: "13px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {statusLabel}
        </div>
      </div>
      <div
        style={{ height: "12px", background: "#0f172a", borderRadius: "3px", overflow: "hidden" }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: isError ? brand.red : accent,
            transition: "width 200ms ease",
          }}
        />
      </div>
      {(isError || isFailure) && (errorText || failedAssert) && (
        <pre
          style={{
            margin: 0,
            padding: "8px 10px",
            background: "#1a0a0a",
            border: `1px solid ${brand.red}55`,
            borderRadius: "4px",
            color: "#fecaca",
            fontSize: "12px",
            lineHeight: 1.4,
            overflow: "auto",
            flexGrow: 1,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {isError
            ? errorText || "Unknown error"
            : failedAssert
              ? `Expected: ${JSON.stringify(failedAssert.expected)}\nGot:      ${JSON.stringify(failedAssert.result ?? failedAssert.actual)}\nArgs:     ${JSON.stringify(failedAssert.arguments)}${failedAssert.output ? `\n\n${failedAssert.output}` : ""}`
              : errorText}
        </pre>
      )}
    </div>
  );
}

function TaskBody({ description, fontSize }) {
  return (
    <div
      style={{
        background: "#060a12",
        color: "#e5e7eb",
        padding: "12px 16px",
        height: "100%",
        overflowY: "auto",
        fontSize: `${fontSize}px`,
        lineHeight: 1.5,
      }}
    >
      <TaskDescriptionMarkdown description={description} />
    </div>
  );
}

function ExamplesBody({ examples, fontSize }) {
  return (
    <div
      className="cb-threejs-examples"
      style={{
        background: "#060a12",
        color: "#ffffff",
        padding: "12px 16px",
        height: "100%",
        overflowY: "auto",
        fontSize: `${fontSize}px`,
        lineHeight: 1.5,
      }}
    >
      <style>{`
        .cb-threejs-examples,
        .cb-threejs-examples p,
        .cb-threejs-examples pre,
        .cb-threejs-examples code,
        .cb-threejs-examples pre code,
        .cb-threejs-examples span {
          color: #ffffff !important;
          background: transparent !important;
        }
        .cb-threejs-examples pre {
          padding: 0;
          margin: 0;
        }
      `}</style>
      <TaskDescriptionMarkdown description={examples || ""} />
    </div>
  );
}

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function TimerBody({ deadlineMs, gameState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const finished = ["game_over", "timeout", "canceled", "finished"].includes(gameState);
  const remaining = finished
    ? 0
    : deadlineMs
      ? Math.max(0, Math.floor((deadlineMs - now) / 1000))
      : null;
  const danger = !finished && remaining !== null && remaining < 60;

  return (
    <div
      style={{
        background: "#060a12",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        fontFamily: "Menlo, Monaco, Consolas, monospace",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: "12px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {finished ? "Finished" : "Time left"}
      </div>
      <div
        style={{
          color: danger ? brand.red : "#ffffff",
          fontSize: "44px",
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {remaining === null ? "--:--" : formatDuration(remaining)}
      </div>
      <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>
        {gameState}
      </div>
    </div>
  );
}

function ThreejsGamePage() {
  const fxRef = useRef(null);
  const arenaRef = useRef(null);
  const stateRef = useRef(null);
  const monacoApiRef = useRef(null);
  const editorRefs = useRef({});
  const remoteDecorationsRef = useRef({});

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [paneHeaders, setPaneHeaders] = useState(() => {
    const preset = loadPreset();
    return {
      task: true,
      examples: true,
      timer: true,
      leftEditor: true,
      rightEditor: true,
      leftTests: true,
      rightTests: true,
      ...(preset?.paneHeaders || {}),
    };
  });

  const togglePaneHeader = (id) => setPaneHeaders((prev) => ({ ...prev, [id]: !prev[id] }));
  const [fontSizes, setFontSizes] = useState(() => {
    const preset = loadPreset();
    return {
      leftEditor: DEFAULT_FONT_SIZE,
      rightEditor: DEFAULT_FONT_SIZE,
      task: 22,
      examples: 22,
      ...(preset?.fontSizes || {}),
    };
  });
  const stageRef = useRef(null);
  const [layouts, setLayouts] = useState(null);
  const [zOrder, setZOrder] = useState({
    task: 1,
    examples: 2,
    timer: 3,
    leftEditor: 4,
    rightEditor: 5,
    leftTests: 6,
    rightTests: 7,
  });
  const dragStateRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const computeDefaults = () => computeDefaultLayouts(stage);

    const isValidLayout = (l) =>
      l && typeof l.x === "number" && typeof l.y === "number" && l.width >= 60 && l.height >= 60;

    const initLayouts = () => {
      const defaults = computeDefaults();
      const preset = loadPreset();
      const merged = {};
      Object.keys(defaults).forEach((key) => {
        merged[key] = isValidLayout(preset?.layouts?.[key]) ? preset.layouts[key] : defaults[key];
      });
      setLayouts((prev) => prev || merged);
      if (preset?.zOrder) {
        setZOrder((prev) => ({ ...prev, ...preset.zOrder }));
      }
    };

    initLayouts();
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setLayouts((prev) => {
        if (!prev) return prev;
        const cur = prev[drag.side];
        const stage = stageRef.current;
        const maxW = stage ? stage.clientWidth : Infinity;
        const maxH = stage ? stage.clientHeight : Infinity;
        let next;
        if (drag.mode === "drag") {
          next = {
            ...cur,
            x: clamp(drag.startLayout.x + dx, 0, Math.max(0, maxW - cur.width)),
            y: clamp(drag.startLayout.y + dy, 0, Math.max(0, maxH - cur.height)),
          };
        } else {
          const minSize = 200;
          next = {
            ...cur,
            width: clamp(drag.startLayout.width + dx, minSize, maxW - cur.x),
            height: clamp(drag.startLayout.height + dy, minSize, maxH - cur.y),
          };
        }
        return { ...prev, [drag.side]: next };
      });
    };
    const onUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startInteraction = (id, mode) => (e) => {
    if (e.button !== 0) return;
    if (!layouts) return;
    e.preventDefault();
    dragStateRef.current = {
      side: id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: { ...layouts[id] },
    };
  };

  const bringToFront = (id) => () => {
    setZOrder((prev) => {
      const max = Math.max(...Object.values(prev));
      if (prev[id] === max) return prev;
      return { ...prev, [id]: max + 1 };
    });
  };

  useEffect(() => {
    if (!layouts) return;
    savePreset({ layouts, fontSizes, zOrder, paneHeaders });
  }, [layouts, fontSizes, zOrder, paneHeaders]);

  const resetPreset = () => {
    clearPreset();
    setLayouts(null);
    setFontSizes({
      leftEditor: DEFAULT_FONT_SIZE,
      rightEditor: DEFAULT_FONT_SIZE,
      task: 22,
      examples: 22,
    });
    setZOrder({
      task: 1,
      examples: 2,
      timer: 3,
      leftEditor: 4,
      rightEditor: 5,
      leftTests: 6,
      rightTests: 7,
    });
    requestAnimationFrame(() => {
      const stage = stageRef.current;
      if (!stage) return;
      setLayouts(computeDefaultLayouts(stage));
    });
  };

  const adjustFont = (id, delta) =>
    setFontSizes((prev) => ({
      ...prev,
      [id]: clamp(
        prev[id] + delta,
        id === "task" ? 10 : MIN_FONT_SIZE,
        id === "task" ? 36 : MAX_FONT_SIZE,
      ),
    }));

  const [battleState, setBattleState] = useState({
    gameState: initialGame.state || "waiting_opponent",
    players: normalizePlayers(initialGame.players || []),
    checking: {},
    typing: {},
    tests: {},
    fx: {
      checkAt: 0,
      winAt: 0,
      lossAt: 0,
      winnerId: null,
      loserId: null,
    },
  });

  useEffect(() => {
    stateRef.current = battleState;
  }, [battleState]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement && document.fullscreenElement === arenaRef.current),
      );
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const gameId = Gon.getAsset("game_id");
    if (!gameId) {
      return () => {};
    }

    const channel = socket.channel(`game:${gameId}`, {});
    const refs = [];

    const appendEvent = (event, payload) => {
      const eventUserId = payload.user_id || payload.userId;

      const applyRemoteCursor = (userId, offset) => {
        const editor = editorRefs.current[userId];
        const monaco = monacoApiRef.current;
        if (!editor || !monaco || typeof offset !== "number") {
          return;
        }

        const model = editor.getModel();
        if (!model) {
          return;
        }

        const position = model.getPositionAt(offset);
        editor.setPosition(position);
        editor.revealPositionInCenterIfOutsideViewport(position);

        const store = remoteDecorationsRef.current[userId] || { cursor: [], selection: [] };
        const cursorDecoration = {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
          options: { className: "cb-editor-remote-cursor cb-remote-opponent" },
        };

        store.cursor = editor.deltaDecorations(store.cursor, [cursorDecoration]);
        remoteDecorationsRef.current[userId] = store;
      };

      const applyRemoteSelection = (userId, startOffset, endOffset) => {
        const editor = editorRefs.current[userId];
        const monaco = monacoApiRef.current;
        if (
          !editor ||
          !monaco ||
          typeof startOffset !== "number" ||
          typeof endOffset !== "number"
        ) {
          return;
        }

        const model = editor.getModel();
        if (!model) {
          return;
        }

        const start = model.getPositionAt(startOffset);
        const finish = model.getPositionAt(endOffset);
        const store = remoteDecorationsRef.current[userId] || { cursor: [], selection: [] };
        const selectionDecoration = {
          range: new monaco.Range(start.lineNumber, start.column, finish.lineNumber, finish.column),
          options: { className: "cb-editor-remote-selection cb-remote-opponent" },
        };

        store.selection = editor.deltaDecorations(store.selection, [selectionDecoration]);
        remoteDecorationsRef.current[userId] = store;
        editor.revealRangeInCenterIfOutsideViewport(selectionDecoration.range);
      };

      const applyRemoteScroll = (userId, scrollTop, scrollLeft) => {
        const editor = editorRefs.current[userId];
        if (!editor) {
          return;
        }

        if (typeof scrollTop === "number") {
          editor.setScrollTop(scrollTop);
        }

        if (typeof scrollLeft === "number") {
          editor.setScrollLeft(scrollLeft);
        }
      };

      if (event === "editor:cursor_position") {
        applyRemoteCursor(eventUserId, payload.offset);
        return;
      }

      if (event === "editor:cursor_selection") {
        applyRemoteSelection(eventUserId, payload.start_offset, payload.end_offset);
        return;
      }

      if (event === "editor:scroll_position") {
        applyRemoteScroll(eventUserId, payload.scroll_top, payload.scroll_left);
        return;
      }

      const eventState = stateFromPayload(payload);
      const playersUpdate = pickPlayers(payload);
      const userId = eventUserId;
      const editorText = payload.editor_text || payload.editorText;
      const editorLang = payload.lang_slug || payload.langSlug;

      setBattleState((prev) => {
        const now = Date.now();
        const nextChecking = { ...prev.checking };
        const nextTyping = { ...prev.typing };
        const nextTests = { ...prev.tests };
        const nextFx = { ...prev.fx };
        let nextPlayers = playersUpdate
          ? normalizePlayers(playersUpdate, prev.players)
          : prev.players;

        if (event === "user:start_check" && userId) {
          nextChecking[userId] = true;
          nextFx.checkAt = now;
        }

        if (event === "user:check_complete" && userId) {
          nextChecking[userId] = false;
          nextTests[userId] = parseTestProgress(payload);

          const { winnerId, loserId } = getOutcomeIds(nextPlayers);
          if (winnerId) {
            nextFx.winAt = now;
            nextFx.winnerId = winnerId;
          }
          if (loserId) {
            nextFx.lossAt = now;
            nextFx.loserId = loserId;
          }
        }

        if (event === "user:won" || event === "user:give_up") {
          const { winnerId, loserId } = getOutcomeIds(nextPlayers);
          if (winnerId) {
            nextFx.winAt = now;
            nextFx.winnerId = winnerId;
          }
          if (loserId) {
            nextFx.lossAt = now;
            nextFx.loserId = loserId;
          }
        }

        if (event === "editor:data" && userId && typeof editorText === "string") {
          const typingMeta = nextTyping[userId] || {};
          const lastText = typingMeta.lastText || "";
          const lastTs = typingMeta.lastTs || now;

          const dt = Math.max(now - lastTs, 1);
          const delta = Math.abs(editorText.length - lastText.length);
          const speed = clamp((delta * 1000) / dt, 0, 24);

          nextTyping[userId] = {
            speed,
            lastTs: now,
            lastText: editorText,
            lastPulseAt: now,
          };

          nextPlayers = updatePlayerEditorData(nextPlayers, userId, editorText, editorLang);
        }

        return {
          ...prev,
          players: nextPlayers,
          typing: nextTyping,
          checking: nextChecking,
          tests: nextTests,
          fx: nextFx,
          gameState: eventState || prev.gameState,
        };
      });
    };

    const addHandler = (event) => {
      const ref = channel.on(event, (payload) => appendEvent(event, payload || {}));
      refs.push({ event, ref });
    };

    [
      "game:user_joined",
      "editor:data",
      "editor:cursor_position",
      "editor:cursor_selection",
      "editor:scroll_position",
      "user:start_check",
      "user:check_complete",
      "user:give_up",
      "user:won",
      "game:timeout",
      "game:finished",
    ].forEach(addHandler);

    channel.join();

    return () => {
      refs.forEach(({ event, ref }) => channel.off(event, ref));
      channel.leave();
    };
  }, []);

  useEffect(() => {
    const container = fxRef.current;
    if (!container) {
      return () => {};
    }

    let alive = true;
    let frameId;

    const prev = {
      checkAt: 0,
      winAt: 0,
      lossAt: 0,
    };

    const runtime = { cleanup: null };

    const init = async () => {
      const THREE = await loadThree();
      if (!alive || !container) {
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.set(0, 0, 10);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setClearColor(0x000000, 0);
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      const particles = [];

      const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      const spawnBurst = (x, colorHex, count = 32) => {
        for (let i = 0; i < count; i += 1) {
          const geometry = new THREE.SphereGeometry(0.045 + Math.random() * 0.04, 10, 10);
          const material = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.95,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(x, 0, 0);
          scene.add(mesh);

          const angle = Math.random() * Math.PI * 2;
          const speed = 0.02 + Math.random() * 0.07;
          const vy = (Math.random() - 0.5) * 0.08;

          particles.push({
            mesh,
            vx: Math.cos(angle) * speed,
            vy,
            vz: Math.sin(angle) * speed * 0.3,
            life: 1,
            decay: 0.7 + Math.random() * 0.9,
          });
        }
      };

      resize();
      window.addEventListener("resize", resize);

      const loop = () => {
        if (!alive) {
          return;
        }

        const s = stateRef.current;
        if (s?.fx) {
          if (s.fx.checkAt > prev.checkAt) {
            prev.checkAt = s.fx.checkAt;
            spawnBurst(0, brand.cyan, 26);
          }

          if (s.fx.winAt > prev.winAt) {
            prev.winAt = s.fx.winAt;
            const leftWin = String(s.fx.winnerId) === String(s.players?.[0]?.id);
            spawnBurst(leftWin ? -3.6 : 3.6, brand.gold, 42);
          }

          if (s.fx.lossAt > prev.lossAt) {
            prev.lossAt = s.fx.lossAt;
            const leftLoss = String(s.fx.loserId) === String(s.players?.[0]?.id);
            spawnBurst(leftLoss ? -3.6 : 3.6, brand.red, 28);
          }
        }

        for (let i = particles.length - 1; i >= 0; i -= 1) {
          const p = particles[i];
          p.mesh.position.x += p.vx;
          p.mesh.position.y += p.vy;
          p.mesh.position.z += p.vz;
          p.vx *= 0.985;
          p.vy *= 0.985;
          p.life -= p.decay * 0.016;
          p.mesh.material.opacity = Math.max(0, p.life);
          p.mesh.scale.setScalar(0.9 + (1 - p.life) * 0.5);

          if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            particles.splice(i, 1);
          }
        }

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(loop);
      };

      frameId = window.requestAnimationFrame(loop);

      const cleanup = () => {
        window.removeEventListener("resize", resize);
        particles.forEach((p) => {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        });
        renderer.dispose();
        container.innerHTML = "";
      };

      runtime.cleanup = cleanup;
    };

    init();

    return () => {
      alive = false;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (runtime.cleanup) {
        runtime.cleanup();
      }
    };
  }, []);

  const players = battleState.players || [];
  const leftPlayer = players[0] || null;
  const rightPlayer = players[1] || null;
  const now = Date.now();

  const getBorder = (player, theme) => {
    const playerId = getPlayerId(player);
    const checking = Boolean(playerId && battleState.checking[playerId]);
    const typingIntensity = getTypingIntensity(battleState.typing[playerId], now);
    const checkPulse = checking
      ? (Math.sin(now / 120) + 1) / 2
      : clamp(1 - (now - (battleState.fx.checkAt || 0)) / 700, 0, 1);
    const winPulse = clamp(1 - (now - (battleState.fx.winAt || 0)) / 1900, 0, 1);
    const lossPulse = clamp(1 - (now - (battleState.fx.lossAt || 0)) / 1450, 0, 1);

    return getEditorBorderState({
      isChecking: checking,
      isWinner: String(battleState.fx.winnerId) === String(playerId),
      isLoser: String(battleState.fx.loserId) === String(playerId),
      typingIntensity,
      checkPulse,
      winPulse,
      lossPulse,
      base: theme.frame,
    });
  };

  const leftBorder = getBorder(leftPlayer, editorThemes[0]);
  const rightBorder = getBorder(rightPlayer, editorThemes[1]);

  const toggleFullscreen = async () => {
    const arena = arenaRef.current;
    if (!arena) {
      return;
    }

    try {
      if (document.fullscreenElement === arena) {
        await document.exitFullscreen();
      } else {
        await arena.requestFullscreen();
      }
    } catch (_e) {
      // no-op
    }
  };

  const registerEditor = (userId) => (editor, monaco) => {
    if (userId) {
      editorRefs.current[userId] = editor;
      remoteDecorationsRef.current[userId] = remoteDecorationsRef.current[userId] || {
        cursor: [],
        selection: [],
      };
    }

    if (!monacoApiRef.current) {
      monacoApiRef.current = monaco;
    }
  };

  const task = initialGame.task || {};
  const taskDescription =
    task.description_ru || task.descriptionRu || task.description_en || task.descriptionEn || "";
  const taskName = task.name || "";
  const taskExamples = task.examples || "";

  const parseUtc = (value) => {
    if (!value) return null;
    const hasTz = /Z|[+-]\d\d:?\d\d$/.test(value);
    const ms = Date.parse(hasTz ? value : `${value}Z`);
    return Number.isNaN(ms) ? null : ms;
  };

  const deadlineMs = (() => {
    const finishes = parseUtc(initialGame.finishes_at);
    if (finishes) return finishes;
    const starts = parseUtc(initialGame.starts_at);
    if (starts && initialGame.timeout_seconds) {
      return starts + initialGame.timeout_seconds * 1000;
    }
    return null;
  })();

  return (
    <div className={isFullscreen ? "" : "container-fluid px-2 py-2"}>
      <div className="row">
        <div className="col-12">
          <div
            ref={arenaRef}
            className={isFullscreen ? "" : "card shadow-sm border-0"}
            style={{ minHeight: isFullscreen ? "100vh" : "78vh" }}
          >
            {!isFullscreen && (
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>{i18next.t("Matrix Broadcast Arena")}</strong>
                <div className="d-flex align-items-center">
                  <span className="badge badge-secondary text-uppercase mr-2">
                    {battleState.gameState}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm mr-2 ${editMode ? "btn-warning" : "btn-outline-warning"}`}
                    onClick={() => setEditMode((v) => !v)}
                  >
                    {editMode ? i18next.t("Done") : i18next.t("Edit Layout")}
                  </button>
                  {editMode && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger mr-2"
                      onClick={resetPreset}
                    >
                      {i18next.t("Reset")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={toggleFullscreen}
                  >
                    {i18next.t("Fullscreen")}
                  </button>
                </div>
              </div>
            )}

            <div
              className="cb-threejs-arena-hover"
              style={{
                position: "relative",
                height: isFullscreen ? "100vh" : "68vh",
                minHeight: isFullscreen ? "100vh" : "68vh",
                background: "#000",
                overflow: "hidden",
              }}
            >
              <div
                ref={fxRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />

              <div
                ref={stageRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 3,
                }}
              >
                {layouts && (
                  <>
                    {taskDescription && (
                      <Pane
                        title={taskName || i18next.t("Task")}
                        accent={brand.gold}
                        layout={layouts.task}
                        zIndex={zOrder.task}
                        fontSize={fontSizes.task}
                        onIncreaseFont={() => adjustFont("task", 1)}
                        onDecreaseFont={() => adjustFont("task", -1)}
                        onDragStart={startInteraction("task", "drag")}
                        onResizeStart={startInteraction("task", "resize")}
                        onBringToFront={bringToFront("task")}
                        editMode={editMode}
                        showHeader={paneHeaders.task}
                        onToggleHeader={() => togglePaneHeader("task")}
                      >
                        <TaskBody description={taskDescription} fontSize={fontSizes.task} />
                      </Pane>
                    )}

                    <Pane
                      title={i18next.t("Timer")}
                      accent={brand.cyan}
                      layout={layouts.timer}
                      zIndex={zOrder.timer}
                      onDragStart={startInteraction("timer", "drag")}
                      onResizeStart={startInteraction("timer", "resize")}
                      onBringToFront={bringToFront("timer")}
                      editMode={editMode}
                      showHeader={paneHeaders.timer}
                      onToggleHeader={() => togglePaneHeader("timer")}
                    >
                      <TimerBody deadlineMs={deadlineMs} gameState={battleState.gameState} />
                    </Pane>

                    {taskExamples && (
                      <Pane
                        title={i18next.t("Examples")}
                        accent={brand.silver}
                        layout={layouts.examples}
                        zIndex={zOrder.examples}
                        fontSize={fontSizes.examples}
                        onIncreaseFont={() => adjustFont("examples", 1)}
                        onDecreaseFont={() => adjustFont("examples", -1)}
                        onDragStart={startInteraction("examples", "drag")}
                        onResizeStart={startInteraction("examples", "resize")}
                        onBringToFront={bringToFront("examples")}
                        editMode={editMode}
                        showHeader={paneHeaders.examples}
                        onToggleHeader={() => togglePaneHeader("examples")}
                      >
                        <ExamplesBody examples={taskExamples} fontSize={fontSizes.examples} />
                      </Pane>
                    )}

                    <Pane
                      key={`leftEditor-${getPlayerId(leftPlayer) || "none"}`}
                      title={`${getPlayerName(leftPlayer)} [${getPlayerLang(leftPlayer)}]`}
                      accent={editorThemes[0].header}
                      border={leftBorder}
                      layout={layouts.leftEditor}
                      zIndex={zOrder.leftEditor}
                      fontSize={fontSizes.leftEditor}
                      onIncreaseFont={() => adjustFont("leftEditor", 2)}
                      onDecreaseFont={() => adjustFont("leftEditor", -2)}
                      onDragStart={startInteraction("leftEditor", "drag")}
                      onResizeStart={startInteraction("leftEditor", "resize")}
                      onBringToFront={bringToFront("leftEditor")}
                      editMode={editMode}
                      showHeader={paneHeaders.leftEditor}
                      onToggleHeader={() => togglePaneHeader("leftEditor")}
                    >
                      <EditorBody
                        player={leftPlayer}
                        fontSize={fontSizes.leftEditor}
                        onMount={registerEditor(getPlayerId(leftPlayer))}
                      />
                    </Pane>

                    <Pane
                      key={`rightEditor-${getPlayerId(rightPlayer) || "none"}`}
                      title={`${getPlayerName(rightPlayer)} [${getPlayerLang(rightPlayer)}]`}
                      accent={editorThemes[1].header}
                      border={rightBorder}
                      layout={layouts.rightEditor}
                      zIndex={zOrder.rightEditor}
                      fontSize={fontSizes.rightEditor}
                      onIncreaseFont={() => adjustFont("rightEditor", 2)}
                      onDecreaseFont={() => adjustFont("rightEditor", -2)}
                      onDragStart={startInteraction("rightEditor", "drag")}
                      onResizeStart={startInteraction("rightEditor", "resize")}
                      onBringToFront={bringToFront("rightEditor")}
                      editMode={editMode}
                      showHeader={paneHeaders.rightEditor}
                      onToggleHeader={() => togglePaneHeader("rightEditor")}
                    >
                      <EditorBody
                        player={rightPlayer}
                        fontSize={fontSizes.rightEditor}
                        onMount={registerEditor(getPlayerId(rightPlayer))}
                      />
                    </Pane>

                    <Pane
                      title={`${getPlayerName(leftPlayer)} — Tests`}
                      accent={editorThemes[0].header}
                      layout={layouts.leftTests}
                      zIndex={zOrder.leftTests}
                      onDragStart={startInteraction("leftTests", "drag")}
                      onResizeStart={startInteraction("leftTests", "resize")}
                      onBringToFront={bringToFront("leftTests")}
                      editMode={editMode}
                      showHeader={paneHeaders.leftTests}
                      onToggleHeader={() => togglePaneHeader("leftTests")}
                    >
                      <TestsBody
                        tests={battleState.tests[getPlayerId(leftPlayer)]}
                        accent={editorThemes[0].header}
                      />
                    </Pane>

                    <Pane
                      title={`${getPlayerName(rightPlayer)} — Tests`}
                      accent={editorThemes[1].header}
                      layout={layouts.rightTests}
                      zIndex={zOrder.rightTests}
                      onDragStart={startInteraction("rightTests", "drag")}
                      onResizeStart={startInteraction("rightTests", "resize")}
                      onBringToFront={bringToFront("rightTests")}
                      editMode={editMode}
                      showHeader={paneHeaders.rightTests}
                      onToggleHeader={() => togglePaneHeader("rightTests")}
                    >
                      <TestsBody
                        tests={battleState.tests[getPlayerId(rightPlayer)]}
                        accent={editorThemes[1].header}
                      />
                    </Pane>
                  </>
                )}
              </div>

              {(() => {
                const winner = (battleState.players || []).find((p) => p?.result === "won");
                if (!winner) return null;
                return (
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 40,
                      background: "rgba(6,10,18,0.92)",
                      border: `2px solid ${brand.gold}`,
                      borderRadius: "999px",
                      padding: "8px 22px",
                      color: brand.gold,
                      fontFamily: "Menlo, Monaco, Consolas, monospace",
                      fontWeight: 700,
                      fontSize: "20px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      boxShadow: `0 0 30px rgba(224,191,122,0.45)`,
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {`🏆 ${getPlayerName(winner)} wins`}
                  </div>
                );
              })()}

              <div className={`cb-threejs-floating-tools${editMode ? " cb-active" : ""}`}>
                <style>{`
                  .cb-threejs-floating-tools {
                    position: absolute;
                    left: 12px;
                    bottom: 12px;
                    z-index: 50;
                    display: flex;
                    gap: 8px;
                    opacity: 0;
                    transition: opacity 180ms ease;
                    pointer-events: none;
                  }
                  .cb-threejs-floating-tools:hover,
                  .cb-threejs-floating-tools.cb-active {
                    opacity: 1;
                    pointer-events: auto;
                  }
                  .cb-threejs-arena-hover:hover .cb-threejs-floating-tools {
                    opacity: 0.85;
                    pointer-events: auto;
                  }
                  .cb-threejs-floating-tools button {
                    background: rgba(6, 10, 18, 0.85);
                    color: #fff;
                    border: 1px solid ${brand.gold};
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 18px;
                    transition: transform 120ms ease, background 120ms ease;
                  }
                  .cb-threejs-floating-tools button:hover {
                    transform: scale(1.08);
                    background: rgba(6, 10, 18, 1);
                  }
                  .cb-threejs-floating-tools button.cb-active {
                    background: ${brand.gold};
                    color: #000;
                  }
                `}</style>
                <button
                  type="button"
                  className={editMode ? "cb-active" : ""}
                  onClick={() => setEditMode((v) => !v)}
                  title={editMode ? i18next.t("Done editing") : i18next.t("Edit Layout")}
                  aria-label="Edit layout"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
                {editMode && (
                  <button
                    type="button"
                    onClick={resetPreset}
                    title={i18next.t("Reset layout")}
                    className="cb-reset"
                    style={{
                      borderColor: brand.red,
                      width: "auto",
                      padding: "0 14px",
                      borderRadius: "20px",
                    }}
                  >
                    {i18next.t("Reset")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ThreejsGamePage);
