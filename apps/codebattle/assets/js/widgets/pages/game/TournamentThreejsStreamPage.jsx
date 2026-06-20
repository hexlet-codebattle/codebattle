import React, { memo, useEffect, useMemo, useState } from "react";

import Gon from "gon";

import socket from "../../../socket";

import ThreejsGamePage from "./ThreejsGamePage";

const ALLOWED_WIDGETS = new Set([
  "task",
  "examples",
  "timer",
  "leftEditor",
  "rightEditor",
  "leftTests",
  "rightTests",
]);

const ALLOWED_THEMES = new Set(["vs", "vs-dark", "hc-black", "hc-light", "cb-stream"]);

const TRUTHY = new Set(["1", "true", "yes", "on"]);

function parseStreamParams(search) {
  const p = new URLSearchParams(search || "");
  const widgetRaw = (p.get("widget") || "").trim();
  const themeRaw = (p.get("editor_theme") || p.get("theme") || "").trim();
  const fontRaw = parseInt(p.get("font_size") || p.get("fontSize") || "", 10);

  return {
    fullscreen: TRUTHY.has((p.get("fullscreen") || "").toLowerCase()),
    widget: widgetRaw || null,
    widgetValid: widgetRaw ? ALLOWED_WIDGETS.has(widgetRaw) : true,
    fontSize: Number.isFinite(fontRaw) && fontRaw >= 8 && fontRaw <= 200 ? fontRaw : null,
    editorTheme: ALLOWED_THEMES.has(themeRaw) ? themeRaw : null,
    hideCup: TRUTHY.has((p.get("hide_cup") || "").toLowerCase()),
  };
}

function TournamentThreejsStreamPage() {
  const tournamentId = Gon.getAsset("tournament_id");
  const initialGameId = Gon.getAsset("game_id") || null;
  const initialGame = Gon.getAsset("game") || null;

  const streamParams = useMemo(
    () => parseStreamParams(typeof window !== "undefined" ? window.location.search : ""),
    [],
  );

  const [activeGameId, setActiveGameId] = useState(initialGameId || null);

  useEffect(() => {
    if (!tournamentId) return () => {};

    const channel = socket.channel(`stream:${tournamentId}`, {});

    const handleActiveGame = (payload) => {
      const id = payload?.id;
      if (id) {
        setActiveGameId((prev) => (prev === id ? prev : id));
      }
    };

    const ref = channel.on("stream:active_game_selected", handleActiveGame);

    channel
      .join()
      .receive("ok", (resp) => {
        if (resp?.active_game_id) {
          setActiveGameId((prev) => (prev === resp.active_game_id ? prev : resp.active_game_id));
        }
      })
      .receive("error", (err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to join tournament stream channel", err);
      });

    return () => {
      channel.off("stream:active_game_selected", ref);
      channel.leave();
    };
  }, [tournamentId]);

  if (!activeGameId) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          background: "#000",
          color: "#e0bf7a",
          fontFamily: "Menlo, Monaco, Consolas, monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "26px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Waiting for the next match...
      </div>
    );
  }

  const initialGameForPane = activeGameId === initialGameId ? initialGame || {} : {};

  return (
    <ThreejsGamePage
      key={activeGameId}
      gameId={activeGameId}
      initialGame={initialGameForPane}
      streamParams={streamParams}
    />
  );
}

export default memo(TournamentThreejsStreamPage);
