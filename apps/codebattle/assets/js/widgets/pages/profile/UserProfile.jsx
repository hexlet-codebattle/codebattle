import React, { useState, useEffect, useMemo } from "react";

import { camelizeKeys } from "humps";
import sum from "lodash/sum";
import { useDispatch } from "react-redux";

import i18n from "../../../i18n";
import LanguageIcon from "../../components/LanguageIcon";
import Loading from "../../components/Loading";
import { actions } from "../../slices";
import CompletedGames from "../lobby/CompletedGames";

import Achievement from "./Achievement";
import Heatmap from "./Heatmap";
import UserStatCharts from "./UserStatCharts";
import UserTournaments from "./UserTournaments";

const hiddenAchievementTypes = new Set(["game_stats", "tournaments_stats"]);
const seasonPlaceColors = {
  gold: "#e0bf7a",
  silver: "#c2c9d6",
  bronze: "#c48a57",
  platinum: "#a4aab3",
};

const getSeasonPlaceColor = (place) => {
  if (place === 1) return seasonPlaceColors.gold;
  if (place === 2) return seasonPlaceColors.silver;
  if (place === 3) return seasonPlaceColors.bronze;
  return seasonPlaceColors.platinum;
};

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [topRivals, setTopRivals] = useState([]);
  const [rivalsStatus, setRivalsStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("statistics");
  const dispatch = useDispatch();
  const userId = useMemo(() => window.location.pathname.split("/").pop(), []);

  useEffect(() => {
    fetch(`/api/v1/user/${userId}/stats`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        setUserData(camelizeKeys(data));
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  }, [dispatch, userId]);

  useEffect(() => {
    setRivalsStatus("loading");

    fetch(`/api/v1/user/${userId}/rivals`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const payload = camelizeKeys(data);
        setTopRivals(payload.topRivals || []);
        setRivalsStatus("loaded");
      })
      .catch(() => {
        setTopRivals([]);
        setRivalsStatus("error");
      });
  }, [userId]);

  if (!userData) {
    return <Loading />;
  }

  const { metrics, user, achievements } = userData;
  const visibleAchievements = achievements.filter((item) => !hiddenAchievementTypes.has(item.type));
  const gameStats = metrics?.gameStats || { won: 0, lost: 0, gaveUp: 0 };
  const seasonResults = userData?.seasonResults || [];
  const languageStats = metrics?.languageStats || {};
  const tournamentStats = metrics?.tournamentsStats || {
    rookieWins: 0,
    challengerWins: 0,
    proWins: 0,
    eliteWins: 0,
    mastersWins: 0,
    grandSlamWins: 0,
  };
  const userInsertedAt = new Date(user.insertedAt).toLocaleString(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hasClan = Boolean(user.clan && user.clan.trim().length > 0);
  const languageEntries = Object.entries(languageStats).sort((a, b) => b[1] - a[1]);
  const gamesCount = sum(Object.values(gameStats));
  const languageGamesCount = sum(Object.values(languageStats));
  const tournamentWinsCount = sum(Object.values(tournamentStats));
  const hasChartsData = gamesCount > 0 || tournamentWinsCount > 0;

  return (
    <div className="row cb-bg-panel cb-rounded py-4">
      <div className="col-12 col-md-3 my-4">
        <div className="pl-md-2 text-center">
          <div className="mb-2 mb-sm-4">
            <img
              className="cb-profile-avatar rounded"
              src={user.avatarUrl}
              alt={i18n.t("User avatar")}
            />
          </div>
          <div>
            <h1 className="cb-heading text-break font-weight-bold">{user.name}</h1>
            <hr className="cb-border-color" />
            <h3 className="cb-heading">
              <span>{i18n.t("Lang")}:</span>
              <LanguageIcon
                className="ml-2"
                lang={user.lang}
                style={{ width: "30px", height: "30px" }}
              />
            </h3>
            <hr className="cb-border-color" />
            <div className="text-center">
              <p className="mb-1 small text-uppercase text-muted">{i18n.t("Clan")}</p>
              {hasClan ? (
                <span className="cb-heading text-break font-weight-bold">
                  {user.clanId ? (
                    <a
                      className="text-decoration-none"
                      style={{ color: "inherit" }}
                      href={`/clans/${user.clanId}`}
                    >
                      {user.clan}
                    </a>
                  ) : (
                    user.clan
                  )}
                </span>
              ) : (
                <span className="text-muted">{i18n.t("No clan")}</span>
              )}
            </div>
            <hr className="cb-border-color" />
            <p className="mb-2 small text-monospace text-muted">
              {i18n.t("joined at %{date}", { date: userInsertedAt })}
            </p>
            {user.githubName && (
              <h3 className="h1">
                <a
                  title={i18n.t("Github account")}
                  className="text-muted"
                  href={`https://github.com/${user.githubName}`}
                  aria-label={i18n.t("Github account")}
                >
                  <span className="fab fa-github" />
                </a>
              </h3>
            )}
            {visibleAchievements.length > 0 && (
              <>
                <hr className="mt-2" />
                <h3 className="text-break cb-heading">{i18n.t("Achievements")}</h3>
                <div className="cb-achievements-grid mt-3">
                  {visibleAchievements.map((item) => (
                    <Achievement key={item.type} achievement={item} />
                  ))}
                </div>
              </>
            )}
            {seasonResults.length > 0 && (
              <>
                <hr className="mt-3" />
                <h3 className="text-break cb-heading">{i18n.t("Seasons")}</h3>
                <div className="mt-2 text-left">
                  {seasonResults.map((result) => (
                    <div
                      key={result.seasonId}
                      className="mb-2 p-2 cb-rounded"
                      style={{
                        backgroundColor: getSeasonPlaceColor(result.place),
                        border: "1px solid rgba(47, 52, 64, 0.25)",
                      }}
                    >
                      <div className="font-weight-bold">
                        <a
                          href={`/seasons/${result.seasonId}`}
                          className="text-decoration-none"
                          style={{ color: "#2f3440" }}
                        >
                          {`${result.seasonName} ${result.seasonYear}`}
                        </a>
                      </div>
                      <div className="small" style={{ color: "#2f3440" }}>
                        {i18n.t("Place: #%{place}", { place: result.place })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="col-12 col-md-9 my-4">
        <div className="pr-md-2 min-h-100 d-flex flex-column">
          <nav>
            <div
              id="nav-tab"
              role="tablist"
              className="nav nav-tabs justify-content-around border-bottom cb-border-color"
            >
              <a
                className="nav-item nav-link active text-uppercase border-0 text-center font-weight-bold rounded-0 flex-fill p-3"
                id="statistics-tab"
                data-toggle="tab"
                href="#statistics"
                role="tab"
                aria-controls="statistics"
                aria-selected="true"
                onClick={() => setActiveTab("statistics")}
              >
                {i18n.t("Statistics")}
              </a>
              <a
                className="nav-item nav-link text-uppercase border-0 text-center font-weight-bold rounded-0 flex-fill p-3"
                id="tournaments-tab"
                data-toggle="tab"
                href="#tournaments"
                role="tab"
                aria-controls="tournaments"
                aria-selected="false"
                onClick={() => setActiveTab("tournaments")}
              >
                {i18n.t("Tournaments")}
              </a>
              <a
                className="nav-item nav-link text-uppercase border-0 text-center font-weight-bold rounded-0 flex-fill p-3"
                id="completedGames-tab"
                data-toggle="tab"
                href="#completedGames"
                role="tab"
                aria-controls="completedGames"
                aria-selected="false"
                onClick={() => setActiveTab("completedGames")}
              >
                {i18n.t("Completed games")}
              </a>
            </div>
          </nav>
          <div
            className="tab-content border cb-border-color border-top-0 rounded-bottom flex-grow-1 basis-0"
            id="nav-tabContent"
          >
            <div
              className="tab-pane fade show active"
              id="statistics"
              role="tabpanel"
              aria-labelledby="statistics-tab"
            >
              <div className="row mt-5 px-3 justify-content-center">
                <div className="col col-md-3 text-center">
                  <div className="h1 cb-stats-number">{user.rating}</div>
                  <p className="lead">{i18n.t("(Elo Rating)")}</p>
                </div>
                {!user.isBot && (
                  <div className="col col-md-3 text-center">
                    <div className="h1 cb-stats-number">{`#${user.rank}`}</div>
                    <p className="lead">{i18n.t("Place")}</p>
                  </div>
                )}
                <div className="col col-md-3 text-center">
                  <div className="h1 cb-stats-number">{user.points || 0}</div>
                  <p className="lead">{i18n.t("Points")}</p>
                </div>
              </div>
              {hasChartsData && (
                <UserStatCharts gameStats={gameStats} tournamentStats={tournamentStats} />
              )}
              {rivalsStatus === "loading" && (
                <div className="row mt-5 px-3 justify-content-center">
                  <div className="col-12 col-lg-10">
                    <div className="small text-center text-muted mb-2">{i18n.t("Rivals")}</div>
                    <Loading small />
                  </div>
                </div>
              )}
              {rivalsStatus === "loaded" && topRivals.length > 0 && (
                <div className="row mt-5 px-3 justify-content-center">
                  <div className="col-12 col-lg-10">
                    <div className="small text-center text-muted mb-2">{i18n.t("Rivals")}</div>
                    <div className="d-flex flex-wrap justify-content-center">
                      {topRivals.map((rival) => (
                        <a
                          key={rival.id}
                          href={`/users/${rival.id}`}
                          className="m-1 px-3 py-2 cb-rounded font-weight-bold text-decoration-none d-block"
                          style={{
                            backgroundColor: "#c2c9d6",
                            border: "1px solid #a4aab3",
                            color: "#2f3440",
                            minWidth: "180px",
                            textAlign: "center",
                          }}
                        >
                          <div>{rival.name}</div>
                          <div className="small">
                            {i18n.t("Clan: %{clan}", { clan: rival.clan || "-" })}
                          </div>
                          <div className="small">
                            {i18n.t("W/L/T: %{wins}/%{losses}/%{timeouts}", {
                              wins: rival.winsCount,
                              losses: rival.lossesCount,
                              timeouts: rival.timeoutsCount,
                            })}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {languageGamesCount > 0 && (
                <div className="row mt-5 px-3 justify-content-center">
                  <div className="col-12 col-lg-10">
                    <div className="small text-center text-muted mb-2">{i18n.t("Languages")}</div>
                    <div className="d-flex flex-wrap justify-content-center">
                      {languageEntries.map(([lang, count]) => (
                        <div
                          key={lang}
                          className="m-1 px-3 py-2 cb-rounded font-weight-bold"
                          style={{
                            backgroundColor: "#c2c9d6",
                            border: "1px solid #a4aab3",
                            color: "#2f3440",
                            minWidth: "88px",
                            textAlign: "center",
                          }}
                        >
                          {`${lang} · ${count}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="row mt-5 mb-md-3 mb-lg-4">
                <div className="col-12">
                  <div className="small text-center text-muted mb-2">{i18n.t("Activity")}</div>
                  <Heatmap />
                </div>
              </div>
            </div>
            <div
              className="tab-pane fade min-h-100"
              id="tournaments"
              role="tabpanel"
              aria-labelledby="tournaments-tab"
            >
              <div className="h-100 d-flex flex-column justify-content-center">
                <UserTournaments isActive={activeTab === "tournaments"} />
              </div>
            </div>
            <div
              className="tab-pane fade min-h-100"
              id="completedGames"
              role="tabpanel"
              aria-labelledby="completedGames-tab"
            >
              <div className="h-100 d-flex flex-column justify-content-center">
                <CompletedGames className="h-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
