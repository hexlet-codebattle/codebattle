import React, { memo, useEffect, useMemo, useState } from "react";

import Gon from "gon";
import { camelizeKeys } from "humps";
import { useDispatch } from "react-redux";

import i18n from "../../../i18n";
import LanguageIcon from "../../components/LanguageIcon";
import PopoverStickOnHover from "../../components/PopoverStickOnHover";
import Placements from "../../config/placements";
import { actions } from "../../slices";
import UserStats from "../../components/UserStats";

const colors = {
  gold: "#e0bf7a",
  silver: "#c2c9d6",
  bronze: "#c48a57",
  platinum: "#a4aab3",
  steel: "#8a919c",
  iron: "#6f7782",
  ink: "#0f1218",
  panel: "#171b22",
  panelAlt: "#1e242d",
  line: "#2b3340",
};

const formatDate = (value) =>
  new Intl.DateTimeFormat(i18n.language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatDuration = (seconds) => {
  if (!seconds) {
    return i18n.t("n/a");
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  if (minutes === 0) {
    return `${restSeconds}s`;
  }

  return `${minutes}m ${restSeconds}s`;
};

function HeadToHeadUserPopover({ user }) {
  const dispatch = useDispatch();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/v1/user/${user.id}/achievements`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setStats(camelizeKeys(data));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          dispatch(actions.setError(error));
        }
      });

    return () => {
      controller.abort();
    };
  }, [dispatch, user.id]);

  return <UserStats user={user} data={stats} />;
}

function HeadToHeadUserLink({ user, placement, className = "" }) {
  const content = useMemo(() => <HeadToHeadUserPopover user={user} />, [user]);

  return (
    <PopoverStickOnHover
      id={`head-to-head-user-${user.id}`}
      placement={placement}
      component={content}
    >
      <a
        href={`/users/${user.id}`}
        className={className}
        style={{ color: "#ffffff", textDecoration: "none" }}
      >
        {user.name}
      </a>
    </PopoverStickOnHover>
  );
}

const formatGameState = (state) => {
  if (state === "game_over") {
    return i18n.t("Finished");
  }

  if (state === "waiting_opponent") {
    return i18n.t("Waiting");
  }

  if (state === "timeout") {
    return i18n.t("Timeout");
  }

  if (state === "playing") {
    return i18n.t("Playing");
  }

  if (state === "canceled") {
    return i18n.t("Canceled");
  }

  if (!state) {
    return i18n.t("Unknown");
  }

  return state.replaceAll("_", " ");
};

const getGameStateTone = (state) => {
  if (state === "game_over") {
    return {
      color: colors.gold,
      backgroundColor: "rgba(224, 191, 122, 0.08)",
      border: "1px solid rgba(224, 191, 122, 0.2)",
    };
  }

  if (state === "playing") {
    return {
      color: colors.silver,
      backgroundColor: "rgba(194, 201, 214, 0.08)",
      border: "1px solid rgba(194, 201, 214, 0.18)",
    };
  }

  return {
    color: colors.steel,
    backgroundColor: "rgba(138, 145, 156, 0.08)",
    border: "1px solid rgba(138, 145, 156, 0.18)",
  };
};

const getPlayerAccent = (winnerId, playerId, index) => {
  if (winnerId === playerId) {
    return colors.gold;
  }

  if (winnerId === null) {
    return index === 0 ? colors.silver : colors.platinum;
  }

  return index === 0 ? colors.steel : colors.iron;
};

const getResultTone = (result) => {
  if (!result) {
    return {
      label: i18n.t("Pending"),
      background: "rgba(138, 145, 156, 0.14)",
      color: colors.steel,
      borderColor: "rgba(138, 145, 156, 0.3)",
    };
  }

  if (result === "won") {
    return {
      label: i18n.t("Won"),
      background: "rgba(224, 191, 122, 0.18)",
      color: colors.gold,
      borderColor: "rgba(224, 191, 122, 0.35)",
    };
  }

  if (result === "lost") {
    return {
      label: i18n.t("Lost"),
      background: "rgba(196, 138, 87, 0.18)",
      color: colors.bronze,
      borderColor: "rgba(196, 138, 87, 0.35)",
    };
  }

  return {
    label: i18n.t("Draw"),
    background: "rgba(162, 170, 179, 0.16)",
    color: colors.platinum,
    borderColor: "rgba(162, 170, 179, 0.28)",
  };
};

function PlayerCard({ player, winnerId, index }) {
  const accent = getPlayerAccent(winnerId, player.id, index);
  const avatarUrl = player.avatar_url || "/assets/images/logo.svg";
  const metaItems = [];

  if (player.rank) {
    metaItems.push(`#${player.rank}`);
  }

  if (player.rating) {
    metaItems.push(player.rating);
  }

  if (player.points || player.points === 0) {
    metaItems.push(i18n.t("%{count} pts", { count: player.points }));
  }

  return (
    <div
      className="cb-rounded h-100"
      style={{
        background: `linear-gradient(145deg, ${colors.panelAlt} 0%, ${colors.ink} 100%)`,
        border: `1px solid ${accent}`,
        boxShadow: `0 16px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.04)`,
      }}
    >
      <div className="p-4 h-100 d-flex flex-column">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <span
            className="text-uppercase small font-weight-bold"
            style={{ color: accent, letterSpacing: "0.12em" }}
          >
            {winnerId === player.id ? i18n.t("Leading") : i18n.t("Contender")}
          </span>
          <span
            className="px-2 py-1 cb-rounded small font-weight-bold"
            style={{
              border: `1px solid ${accent}`,
              color: accent,
              backgroundColor: "rgba(255, 255, 255, 0.02)",
            }}
          >
            {i18n.t("%{count} wins", { count: player.wins })}
          </span>
        </div>
        <div className="d-flex align-items-center">
          <div
            className="mr-4 d-flex align-items-center justify-content-center cb-rounded flex-shrink-0"
            style={{
              width: "92px",
              height: "92px",
              background:
                "linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015))",
              border: `1px solid rgba(255, 255, 255, 0.06)`,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            }}
          >
            <img
              src={avatarUrl}
              alt={player.name}
              className="cb-rounded"
              style={{ width: "72px", height: "72px", objectFit: "cover" }}
            />
          </div>
          <div className="min-w-0 flex-grow-1">
            <div
              className="mb-3"
              style={{
                fontSize: "2rem",
                lineHeight: 1.1,
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              <HeadToHeadUserLink
                user={player}
                className="d-inline-block"
                placement={index === 0 ? Placements.bottomStart : Placements.bottomEnd}
              />
            </div>
            <div className="d-flex flex-wrap align-items-center text-muted">
              <span
                className="d-inline-flex align-items-center justify-content-center mr-3 mb-2 cb-rounded"
                style={{
                  width: "34px",
                  height: "34px",
                  color: colors.silver,
                  backgroundColor: "rgba(194, 201, 214, 0.08)",
                  border: "1px solid rgba(194, 201, 214, 0.15)",
                }}
              >
                <LanguageIcon lang={player.lang} color={colors.silver} />
              </span>
              {metaItems.map((item) => (
                <span
                  key={`${player.id}-${item}`}
                  className="mr-2 mb-2 px-3 py-2 cb-rounded"
                  style={{
                    color: colors.platinum,
                    backgroundColor: "rgba(164, 170, 179, 0.08)",
                    border: "1px solid rgba(164, 170, 179, 0.12)",
                    fontSize: "1rem",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({ game, players }) {
  const [firstPlayer, secondPlayer] = players;
  const firstResultTone = getResultTone(game.first_player_result);
  const secondResultTone = getResultTone(game.second_player_result);
  const gameStateTone = getGameStateTone(game.state);
  const firstResultStyle = {
    background: firstResultTone.background,
    color: firstResultTone.color,
    border: `1px solid ${firstResultTone.borderColor}`,
  };
  const secondResultStyle = {
    background: secondResultTone.background,
    color: secondResultTone.color,
    border: `1px solid ${secondResultTone.borderColor}`,
  };

  return (
    <div
      className="cb-rounded p-3 p-lg-4 mb-3"
      style={{
        background: `linear-gradient(140deg, ${colors.panel} 0%, ${colors.ink} 100%)`,
        border: `1px solid ${colors.line}`,
        boxShadow: "0 14px 30px rgba(0, 0, 0, 0.18)",
      }}
    >
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-3">
        <div className="mb-2 mb-lg-0">
          <div
            className="small text-uppercase font-weight-bold"
            style={{ color: colors.steel, letterSpacing: "0.12em" }}
          >
            {i18n.t("Game")} #{game.id}
          </div>
          <div className="h5 mb-0 text-white">
            {game.mode} • {game.level} • {game.task_type}
          </div>
        </div>
        <div className="d-flex flex-column align-items-lg-end">
          <div className="text-muted small mb-2 mb-lg-1">{formatDate(game.inserted_at)}</div>
          <a
            href={`/games/${game.id}`}
            className="small text-uppercase font-weight-bold text-decoration-none"
            style={{ color: colors.gold, letterSpacing: "0.12em" }}
          >
            {i18n.t("Open game")}
          </a>
        </div>
      </div>

      <div className="row">
        <div className="col-12 col-lg-5 mb-3 mb-lg-0 d-flex align-items-center">
          <HeadToHeadUserLink
            user={firstPlayer}
            className="d-inline-block"
            placement={Placements.bottomStart}
          />
          <div
            className="ml-3 px-3 py-2 cb-rounded d-inline-flex align-items-center"
            style={firstResultStyle}
          >
            {firstResultTone.label}
          </div>
        </div>

        <div className="col-12 col-lg-2 d-flex align-items-center justify-content-lg-center mb-3 mb-lg-0">
          <div
            className="px-3 py-2 cb-rounded text-uppercase small font-weight-bold"
            style={{
              ...gameStateTone,
              letterSpacing: "0.08em",
            }}
          >
            {formatGameState(game.state)}
          </div>
        </div>

        <div className="col-12 col-lg-5 d-flex align-items-center justify-content-lg-end">
          <HeadToHeadUserLink
            user={secondPlayer}
            className="d-inline-block"
            placement={Placements.bottomEnd}
          />
          <div
            className="ml-3 px-3 py-2 cb-rounded d-inline-flex align-items-center"
            style={secondResultStyle}
          >
            {secondResultTone.label}
          </div>
        </div>
      </div>

      <div
        className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-3"
        style={{ borderTop: `1px solid ${colors.line}` }}
      >
        <span className="small" style={{ color: colors.platinum }}>
          {i18n.t("Duration: %{duration}", {
            duration: formatDuration(game.duration_sec || game.timeout_seconds),
          })}
        </span>
        <span className="small" style={{ color: colors.iron }}>
          {game.finishes_at
            ? i18n.t("Finished %{date}", { date: formatDate(game.finishes_at) })
            : i18n.t("Still in progress")}
        </span>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone }) {
  return (
    <div
      className="cb-rounded p-3 h-100"
      style={{
        background: `linear-gradient(145deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))`,
        border: `1px solid ${tone}`,
      }}
    >
      <div
        className="small text-uppercase font-weight-bold"
        style={{ color: tone, letterSpacing: "0.1em" }}
      >
        {label}
      </div>
      <div className="display-4 font-weight-bold text-white mb-0">{value}</div>
    </div>
  );
}

function HeadToHeadPage() {
  const headToHead = useMemo(
    () => (Gon && Gon.getAsset && Gon.getAsset("head_to_head")) || null,
    [],
  );

  if (!headToHead) {
    return null;
  }

  const players = headToHead.players || [];

  return (
    <div
      className="cb-bg-panel cb-text min-vh-100 py-5"
      style={{
        background:
          "radial-gradient(circle at top, rgba(224, 191, 122, 0.08), transparent 30%), linear-gradient(180deg, #0b0e13 0%, #121720 40%, #0d1118 100%)",
      }}
    >
      <div className="container">
        <div
          className="cb-rounded p-4 p-lg-5 mb-4"
          style={{
            background: `linear-gradient(135deg, ${colors.ink} 0%, ${colors.panel} 55%, ${colors.panelAlt} 100%)`,
            border: `1px solid ${colors.line}`,
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)",
          }}
        >
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end mb-4">
            <div className="mb-3 mb-lg-0">
              <div
                className="small text-uppercase font-weight-bold mb-2"
                style={{ color: colors.gold, letterSpacing: "0.18em" }}
              >
                {i18n.t("H2H Arena")}
              </div>
              <h1 className="mb-2" style={{ color: "#fff" }}>
                {players.map((player) => player.name).join(" vs ")}
              </h1>
              <div style={{ color: colors.platinum }}>
                {i18n.t(
                  "Direct duel history with profile links, live status, and every shared game.",
                )}
              </div>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-12 col-md-4 mb-3">
              <SummaryStat
                label={i18n.t("Total games")}
                value={headToHead.total_games}
                tone={colors.gold}
              />
            </div>
            <div className="col-12 col-md-4 mb-3">
              <SummaryStat
                label={i18n.t("Completed")}
                value={headToHead.completed_games}
                tone={colors.silver}
              />
            </div>
            <div className="col-12 col-md-4 mb-3">
              <SummaryStat label={i18n.t("Draws")} value={headToHead.draws} tone={colors.bronze} />
            </div>
          </div>

          <div className="row">
            {players.map((player, index) => (
              <div key={player.id} className="col-12 col-lg-6 mb-3">
                <PlayerCard player={player} winnerId={headToHead.winner_id} index={index} />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3 d-flex justify-content-between align-items-center">
          <h2 className="mb-0" style={{ color: colors.silver }}>
            {i18n.t("All games")}
          </h2>
          <div className="small" style={{ color: colors.steel }}>
            {i18n.t("%{count} records", { count: headToHead.games.length })}
          </div>
        </div>

        {headToHead.games.length === 0 ? (
          <div
            className="cb-rounded p-4 text-center"
            style={{
              background: `linear-gradient(145deg, ${colors.panel} 0%, ${colors.ink} 100%)`,
              border: `1px solid ${colors.line}`,
            }}
          >
            {i18n.t("No games found for this pair.")}
          </div>
        ) : (
          headToHead.games.map((game) => <MatchRow key={game.id} game={game} players={players} />)
        )}
      </div>
    </div>
  );
}

export default memo(HeadToHeadPage);
