import React, { memo, useEffect, useRef, useState } from "react";

import MonacoEditor from "@monaco-editor/react";
import Gon from "gon";
import i18next from "i18next";

import "../../initEditor";
import socket from "../../../socket";
import languages from "../../config/languages";

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

const matrixCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
const MATRIX_CELL_WIDTH = 14;
const MATRIX_CELL_HEIGHT = 18;

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

  return {
    successCount,
    assertsCount,
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

const initMatrixState = (canvas) => {
  const columns = Math.ceil(canvas.width / MATRIX_CELL_WIDTH);
  return Array.from({ length: columns }, () => ({
    y: -Math.random() * 40,
    speed: 0.12 + Math.random() * 0.22,
    tail: 10 + Math.floor(Math.random() * 18),
  }));
};

const drawMatrixBackground = ({ canvas, ctx, columns }) => {
  const { width, height } = canvas;

  ctx.fillStyle = "rgba(0, 0, 0, 0.09)";
  ctx.fillRect(0, 0, width, height);

  ctx.font = `bold ${MATRIX_CELL_HEIGHT}px Menlo, Monaco, Consolas, monospace`;

  columns.forEach((column, index) => {
    const x = index * MATRIX_CELL_WIDTH;
    const headY = Math.floor(column.y) * MATRIX_CELL_HEIGHT;

    for (let i = 0; i < column.tail; i += 1) {
      const y = headY - i * MATRIX_CELL_HEIGHT;
      if (y >= -MATRIX_CELL_HEIGHT && y <= height + MATRIX_CELL_HEIGHT) {
        const text = matrixCharacters[Math.floor(Math.random() * matrixCharacters.length)];
        const alpha = clamp(1 - i / column.tail, 0.06, 1);
        const colorAlpha = i === 0 ? 1 : alpha * 0.88;

        ctx.fillStyle = `rgba(224, 191, 122, ${colorAlpha})`;
        ctx.fillText(text, x, y);
      }
    }

    column.y += column.speed;

    if (headY > height + 80 && Math.random() > 0.985) {
      column.y = -Math.random() * 50;
      column.speed = 0.12 + Math.random() * 0.22;
      column.tail = 10 + Math.floor(Math.random() * 18);
    }
  });
};

const editorOptions = {
  minimap: { enabled: false },
  readOnly: true,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  lineNumbers: "on",
  fontSize: 32,
  wordWrap: "off",
  renderWhitespace: "none",
  contextmenu: false,
};

const initialGame = Gon.getAsset("game") || {};

function MonacoPane({ player, tests, border, accent, onMount }) {
  const total = tests?.assertsCount || 0;
  const success = tests?.successCount || 0;
  const percent = total > 0 ? clamp((success / total) * 100, 0, 100) : 0;

  const language = languages[getPlayerLang(player)] || "javascript";

  const wrapperStyle = {
    border: `${border.width}px solid ${border.color}`,
    boxShadow: `0 0 28px rgba(224, 191, 122, ${border.alpha})`,
    background: "#090d16",
    borderRadius: "10px",
    overflow: "hidden",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={wrapperStyle}>
      <div
        style={{
          background: "#060a12",
          color: "#fff",
          fontFamily: "Menlo, Monaco, Consolas, monospace",
          fontWeight: 700,
          fontSize: "20px",
          padding: "10px 14px",
          borderBottom: `2px solid ${accent}`,
        }}
      >
        {`${getPlayerName(player)} [${getPlayerLang(player)}]`}
      </div>
      <div style={{ flexGrow: 1 }}>
        <MonacoEditor
          theme="vs-dark"
          language={language}
          value={getPlayerText(player)}
          height="100%"
          options={editorOptions}
          onMount={onMount}
        />
      </div>
      <div
        style={{
          background: "#060a12",
          padding: "10px 14px 12px",
          borderTop: "1px solid #111827",
          fontFamily: "Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: "20px",
            marginBottom: "8px",
            fontWeight: 700,
          }}
        >
          {`Tests: ${success}/${total}`}
        </div>
        <div style={{ height: "16px", background: "#0f172a" }}>
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: accent,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ThreejsGamePage() {
  const matrixRef = useRef(null);
  const fxRef = useRef(null);
  const arenaRef = useRef(null);
  const stateRef = useRef(null);
  const monacoApiRef = useRef(null);
  const editorRefs = useRef({});
  const remoteDecorationsRef = useRef({});

  const [isFullscreen, setIsFullscreen] = useState(false);
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
    const canvas = matrixRef.current;
    if (!canvas) {
      return () => {};
    }

    const ctx = canvas.getContext("2d");
    let frameId;
    let matrixColumns = [];

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      matrixColumns = initMatrixState(canvas);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resize();

    const loop = () => {
      drawMatrixBackground({
        canvas,
        ctx,
        columns: matrixColumns,
      });
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
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
                    className="btn btn-sm btn-outline-secondary"
                    onClick={toggleFullscreen}
                  >
                    {i18next.t("Fullscreen")}
                  </button>
                </div>
              </div>
            )}

            <div
              style={{
                position: "relative",
                height: isFullscreen ? "100vh" : "68vh",
                minHeight: isFullscreen ? "100vh" : "68vh",
                background: "#000",
                overflow: "hidden",
              }}
            >
              <canvas
                ref={matrixRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                }}
              />

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
                style={{
                  position: "relative",
                  zIndex: 3,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "18px",
                  width: "100%",
                  height: isFullscreen ? "100vh" : "68vh",
                  minHeight: isFullscreen ? "100vh" : "68vh",
                  padding: isFullscreen ? "16px" : "14px",
                }}
              >
                <MonacoPane
                  key={`left-${getPlayerId(leftPlayer) || "none"}`}
                  player={leftPlayer}
                  tests={battleState.tests[getPlayerId(leftPlayer)]}
                  border={leftBorder}
                  accent={editorThemes[0].header}
                  onMount={registerEditor(getPlayerId(leftPlayer))}
                />

                <MonacoPane
                  key={`right-${getPlayerId(rightPlayer) || "none"}`}
                  player={rightPlayer}
                  tests={battleState.tests[getPlayerId(rightPlayer)]}
                  border={rightBorder}
                  accent={editorThemes[1].header}
                  onMount={registerEditor(getPlayerId(rightPlayer))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ThreejsGamePage);
