import React, { memo, useEffect, useState } from "react";

import Gon from "gon";

import socket from "../../../socket";

import ThreejsGamePage from "./ThreejsGamePage";

function TournamentThreejsStreamPage() {
  const tournamentId = Gon.getAsset("tournament_id");
  const initialGameId = Gon.getAsset("game_id") || null;
  const initialGame = Gon.getAsset("game") || null;

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
    <ThreejsGamePage key={activeGameId} gameId={activeGameId} initialGame={initialGameForPane} />
  );
}

export default memo(TournamentThreejsStreamPage);
