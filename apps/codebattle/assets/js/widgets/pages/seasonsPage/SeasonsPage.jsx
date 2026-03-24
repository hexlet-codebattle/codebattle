import React, { memo } from "react";

import cn from "classnames";
import Gon from "gon";

import i18n from "../../../i18n";
import dayjs from "../../../i18n/dayjs";

const getMedalEmoji = (place) => {
  switch (place) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return null;
  }
};

const formatSeasonDates = (season) =>
  `${dayjs(season.starts_at).format("MMM D, YYYY")} - ${dayjs(season.ends_at).format("MMM D, YYYY")}`;

function PodiumPlace({ result, size = "normal" }) {
  const isLarge = size === "large";

  return (
    <div
      className={cn("card h-100 border-0 shadow-sm cb-hof-podium-card cb-seasons-podium-card", {
        "cb-gold-place-bg": result.place === 1,
        "cb-silver-place-bg": result.place === 2,
        "cb-bronze-place-bg": result.place === 3,
      })}
    >
      <div className={cn("card-body text-center", isLarge ? "py-4" : "py-3")}>
        <div className={cn("mb-2", isLarge ? "fs-2" : "fs-4")}>{getMedalEmoji(result.place)}</div>
        <h6 className={cn("text-white mb-2", isLarge && "fs-5 fw-bold")}>{result.user_name}</h6>
        {result.clan_name && (
          <div className="mb-2">
            <span className="small text-muted">{result.clan_name}</span>
          </div>
        )}
        <div className={cn("fw-bold", isLarge ? "fs-4 text-warning" : "fs-5 text-white")}>
          {result.total_points}
        </div>
        <div className="text-muted small">{i18n.t("points")}</div>
      </div>
    </div>
  );
}

function Top3Podium({ top3 }) {
  if (!top3 || top3.length === 0) {
    return <div className="text-muted text-center py-5">{i18n.t("No results yet")}</div>;
  }

  const first = top3.find((r) => r.place === 1);
  const second = top3.find((r) => r.place === 2);
  const third = top3.find((r) => r.place === 3);

  return (
    <div className="row mx-n2 align-items-end cb-seasons-podium-row">
      <div className="col-4 px-2">
        {second && (
          <div className="cb-seasons-podium-offset cb-seasons-podium-offset-second">
            <PodiumPlace result={second} />
          </div>
        )}
      </div>

      <div className="col-4 px-2">{first && <PodiumPlace result={first} size="large" />}</div>

      <div className="col-4 px-2">
        {third && (
          <div className="cb-seasons-podium-offset cb-seasons-podium-offset-third">
            <PodiumPlace result={third} />
          </div>
        )}
      </div>
    </div>
  );
}

function SeasonCard({ season }) {
  return (
    <div className="cb-bg-panel cb-border-color cb-rounded shadow-sm border text-light h-100 cb-seasons-card">
      <div className="p-3 p-lg-4 d-flex flex-column h-100">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start mb-3 cb-seasons-card-header">
          <div className="pr-sm-3">
            <div className="text-uppercase small text-muted cb-seasons-card-kicker">
              {i18n.t("Season")}
            </div>
            <h3 className="card-title text-gold mb-2 cb-seasons-card-title">
              {season.name} {season.year}
            </h3>
            <div className="text-muted small cb-seasons-card-dates">
              {formatSeasonDates(season)}
            </div>
          </div>
          <a
            href={`/seasons/${season.id}`}
            className="btn btn-sm btn-outline-gold mt-3 mt-sm-0 cb-seasons-action"
          >
            {i18n.t("View Results")}
          </a>
        </div>

        <div className="flex-grow-1 d-flex flex-column justify-content-center cb-seasons-card-body">
          <Top3Podium top3={season.top3} />
        </div>
      </div>
    </div>
  );
}

function SeasonsPage() {
  const seasons = (Gon && Gon.getAsset && Gon.getAsset("seasons")) || [];

  return (
    <div className="cb-bg-panel cb-text min-vh-100 py-5 cb-seasons-page">
      <div className="container">
        <div className="cb-bg-panel cb-rounded shadow-sm px-3 px-lg-4 py-4 mb-4 cb-seasons-hero">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
            <div className="text-center text-md-left">
              <div className="text-uppercase small text-muted cb-seasons-eyebrow">
                {i18n.t("Competition archive")}
              </div>
              <h1 className="text-gold fw-bold mb-2 cb-seasons-title">{i18n.t("Seasons")}</h1>
              <p className="text-muted mb-0 cb-seasons-subtitle">
                {i18n.t("Browse finished seasons and open the full leaderboard for each one.")}
              </p>
            </div>
            <div className="mt-3 mt-md-0">
              <a href="/hall_of_fame" className="btn btn-outline-gold cb-seasons-hero-action">
                {i18n.t("Hall of Fame")}
              </a>
            </div>
          </div>
        </div>

        {seasons.length === 0 ? (
          <div className="card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light cb-seasons-empty">
            <div className="card-body text-center py-5">
              <p className="text-muted mb-0">{i18n.t("No seasons found")}</p>
            </div>
          </div>
        ) : (
          <div className="row">
            {seasons.map((season) => (
              <div key={season.id} className="col-12 col-xl-6 mb-4">
                <SeasonCard season={season} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(SeasonsPage);
