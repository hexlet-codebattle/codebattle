import React, { memo } from "react";

import cn from "classnames";
import Gon from "gon";

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

function PodiumPlace({ result, size = "normal" }) {
  const isLarge = size === "large";

  return (
    <div
      className={cn("card h-100 border-0 cb-hof-podium-card", {
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
        <div className="text-muted small">points</div>
      </div>
    </div>
  );
}

function Top3Podium({ top3 }) {
  if (!top3 || top3.length === 0) {
    return <div className="text-muted text-center py-4">No results yet</div>;
  }

  const first = top3.find((r) => r.place === 1);
  const second = top3.find((r) => r.place === 2);
  const third = top3.find((r) => r.place === 3);

  return (
    <div className="row g-2 align-items-end">
      {/* Second place - left */}
      <div className="col-4">
        {second && (
          <div style={{ marginTop: "1.5rem" }}>
            <PodiumPlace result={second} />
          </div>
        )}
      </div>

      {/* First place - center, elevated */}
      <div className="col-4">{first && <PodiumPlace result={first} size="large" />}</div>

      {/* Third place - right */}
      <div className="col-4">
        {third && (
          <div style={{ marginTop: "2rem" }}>
            <PodiumPlace result={third} />
          </div>
        )}
      </div>
    </div>
  );
}

function SeasonCard({ season }) {
  return (
    <div
      className="card cb-bg-panel cb-border-color cb-rounded shadow-lg border-0 text-light h-100"
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
      }}
    >
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h3 className="card-title text-gold mb-1 fs-4">
              {season.name} {season.year}
            </h3>
            <div className="text-muted small">
              {season.starts_at}
              {" — "}
              {season.ends_at}
            </div>
          </div>
          <a href={`/seasons/${season.id}`} className="btn btn-sm btn-outline-gold">
            View Results
          </a>
        </div>

        <div className="flex-grow-1 d-flex flex-column justify-content-center">
          <Top3Podium top3={season.top3} />
        </div>
      </div>
    </div>
  );
}

function SeasonsPage() {
  const seasons = (Gon && Gon.getAsset && Gon.getAsset("seasons")) || [];

  return (
    <div className="cb-bg-panel cb-text min-vh-100 py-5">
      <div className="container">
        <div className="position-relative mb-5 text-center">
          <h1 className="text-gold fw-bold mb-0">Seasons</h1>
          <a
            href="/hall_of_fame"
            className="btn btn-outline-gold d-none d-md-inline-flex position-absolute top-50 end-0 translate-middle-y"
          >
            Hall of Fame
          </a>
          <div className="d-md-none mt-3">
            <a href="/hall_of_fame" className="btn btn-outline-gold">
              Hall of Fame
            </a>
          </div>
        </div>

        {seasons.length === 0 ? (
          <div className="card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light">
            <div className="card-body text-center py-5">
              <p className="text-muted mb-0">No seasons found</p>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {seasons.map((season) => (
              <div key={season.id} className="col-lg-6">
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
