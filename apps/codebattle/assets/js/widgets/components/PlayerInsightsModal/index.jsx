import React, { useState, useMemo, useEffect } from "react";

import axios from "axios";
import cn from "classnames";
import Spinner from "react-bootstrap/Spinner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
} from "recharts";

import Modal from "@/components/BootstrapModal";

import LanguageIcon from "../LanguageIcon";
import {
  GRADE_COLORS,
  ALL_GRADES,
  getPlaceBadgeClass,
  getMedalEmoji,
  formatTime,
  formatGradeName,
  formatDate,
} from "../SeasonLeaderboard";

// Grade Stats Chart Component - now shows all grades
function GradeStatsChart({ gradeStats }) {
  // Create a map of existing grade stats
  const gradeStatsMap = useMemo(() => {
    const map = {};
    if (gradeStats) {
      gradeStats.forEach((g) => {
        map[g.grade] = g;
      });
    }
    return map;
  }, [gradeStats]);

  // Build chart data with all grades (even those with 0 points)
  const chartData = ALL_GRADES.map((grade) => ({
    name: formatGradeName(grade),
    points: gradeStatsMap[grade]?.total_points || 0,
    tournaments: gradeStatsMap[grade]?.tournaments_count || 0,
    wins: gradeStatsMap[grade]?.total_wins || 0,
    fill: GRADE_COLORS[grade] || "#666",
  }));

  return (
    <div className="mb-4">
      <h6 className="text-muted text-uppercase mb-3">Points by Tournament Grade</h6>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis type="number" stroke="#999" />
          <YAxis type="category" dataKey="name" stroke="#999" width={100} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            labelStyle={{ color: "#fff" }}
          />
          <Bar dataKey="points" name="Points">
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Win Rate Donut Chart
function WinRateChart({ wins, total }) {
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const data = [
    { name: "Wins", value: wins, fill: "#198754" },
    { name: "Losses", value: total - wins, fill: "#2d2d2d" },
  ];

  return (
    <div className="text-center">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ marginTop: "-40px", position: "relative" }}>
        <div className="fs-4 fw-bold text-success">{winRate}%</div>
        <div className="text-muted small">Win Rate</div>
      </div>
    </div>
  );
}

// Performance Trend Chart
function PerformanceTrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;

  const chartData = trend.map((t) => ({
    week: formatDate(t.week),
    points: t.total_points,
    wins: t.total_wins,
    tournaments: t.tournaments_count,
  }));

  return (
    <div className="mb-4">
      <h6 className="text-muted text-uppercase mb-3">Weekly Performance Trend</h6>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="week" stroke="#999" />
          <YAxis stroke="#999" />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            labelStyle={{ color: "#fff" }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="points"
            name="Points"
            stroke="#0dcaf0"
            fill="#0dcaf0"
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="wins"
            name="Wins"
            stroke="#198754"
            fill="#198754"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Grade Stats Table
function GradeStatsTable({ gradeStats }) {
  if (!gradeStats || gradeStats.length === 0) {
    return <div className="text-center text-muted py-3">No tournament data by grade available</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-dark table-sm mb-0">
        <thead>
          <tr className="text-muted small">
            <th>Grade</th>
            <th className="text-center">Tournaments</th>
            <th className="text-center">Points</th>
            <th className="text-center">Wins</th>
            <th className="text-center">Best</th>
            <th className="text-center">Avg</th>
            <th className="text-center">Podiums</th>
          </tr>
        </thead>
        <tbody>
          {gradeStats.map((g) => (
            <tr key={g.grade}>
              <td>
                <span className="fw-bold" style={{ color: GRADE_COLORS[g.grade] || "#666" }}>
                  {formatGradeName(g.grade)}
                </span>
              </td>
              <td className="text-center">{g.tournaments_count}</td>
              <td className="text-center fw-bold text-warning">{g.total_points}</td>
              <td className="text-center text-success">{g.total_wins}</td>
              <td className="text-center">
                {g.best_place ? (
                  <span className={cn("badge badge-sm", getPlaceBadgeClass(g.best_place))}>
                    {g.best_place}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="text-center">{g.avg_place?.toFixed(1) || "-"}</td>
              <td className="text-center">
                {g.podium_finishes && g.podium_finishes.length > 0 ? (
                  <span>{g.podium_finishes.map((p) => getMedalEmoji(p)).join("")}</span>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tournaments Table (no scroll limit)
function TournamentsTable({ tournaments }) {
  if (!tournaments || tournaments.length === 0) {
    return <div className="text-center text-muted py-3">No tournament data available</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-dark table-sm table-hover mb-0">
        <thead className="bg-dark">
          <tr className="text-muted small">
            <th>Tournament</th>
            <th className="text-center">Grade</th>
            <th className="text-center">Place</th>
            <th className="text-center">Points</th>
            <th className="text-center">W/G</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t.tournament_id}>
              <td>
                <a
                  href={`/tournaments/${t.tournament_id}`}
                  className="text-light text-decoration-none"
                >
                  {t.tournament_name || `Tournament #${t.tournament_id}`}
                  <small className="text-muted ml-2">{formatDate(t.started_at)}</small>
                </a>
              </td>
              <td className="text-center">
                <span className="fw-bold" style={{ color: GRADE_COLORS[t.grade] || "#666" }}>
                  {formatGradeName(t.grade)}
                </span>
              </td>
              <td className="text-center">
                <span className={cn("badge badge-sm", getPlaceBadgeClass(t.place))}>
                  {t.place <= 3 ? getMedalEmoji(t.place) : `#${t.place}`}
                </span>
                <small className="text-muted ml-1">/{t.total_participants}</small>
              </td>
              <td className="text-center fw-bold text-warning">{t.points}</td>
              <td className="text-center">
                <span className="text-success">{t.wins_count}</span>/{t.games_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Player Insights Modal with API loading
function PlayerInsightsModal({ show, onHide, player, allResults, season }) {
  const [loading, setLoading] = useState(false);
  const [detailedStats, setDetailedStats] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch detailed stats when modal opens
  useEffect(() => {
    if (show && player && season) {
      setLoading(true);
      setError(null);

      axios
        .get(`/api/v1/seasons/${season.id}/players/${player.user_id}/stats`)
        .then((response) => {
          setDetailedStats(response.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch player stats:", err);
          setError("Failed to load detailed stats");
          setLoading(false);
        });
    }
  }, [show, player, season]);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setDetailedStats(null);
      setActiveTab("overview");
    }
  }, [show]);

  // Calculate median stats from all results for comparison
  const medianStats = useMemo(() => {
    if (!allResults || allResults.length === 0) return null;

    const sortedPoints = [...allResults].sort((a, b) => a.total_points - b.total_points);
    const sortedWins = [...allResults].sort((a, b) => a.total_wins_count - b.total_wins_count);
    const sortedGames = [...allResults].sort((a, b) => a.total_games_count - b.total_games_count);
    const sortedTournaments = [...allResults].sort(
      (a, b) => a.tournaments_count - b.tournaments_count,
    );
    const sortedScore = [...allResults].sort((a, b) => a.total_score - b.total_score);

    const mid = Math.floor(allResults.length / 2);
    const getMedian = (arr) =>
      arr.length % 2 === 0 ? Math.round((arr[mid - 1] + arr[mid]) / 2) : arr[mid];

    const winRates = allResults
      .filter((r) => r.total_games_count > 0)
      .map((r) => (r.total_wins_count / r.total_games_count) * 100)
      .sort((a, b) => a - b);
    const winRateMid = Math.floor(winRates.length / 2);

    return {
      points: getMedian(sortedPoints.map((r) => r.total_points)),
      wins: getMedian(sortedWins.map((r) => r.total_wins_count)),
      games: getMedian(sortedGames.map((r) => r.total_games_count)),
      tournaments: getMedian(sortedTournaments.map((r) => r.tournaments_count)),
      score: getMedian(sortedScore.map((r) => r.total_score)),
      winRate: (() => {
        if (winRates.length === 0) return 0;
        if (winRates.length % 2 === 0) {
          return (winRates[winRateMid - 1] + winRates[winRateMid]) / 2;
        }
        return winRates[winRateMid];
      })(),
    };
  }, [allResults]);

  if (!player) return null;

  // Calculate derived statistics from allResults (basic stats)
  const totalPlayers = allResults.length;
  const percentile =
    totalPlayers > 0 ? Math.round(((totalPlayers - player.place) / totalPlayers) * 100) : 0;

  // Get grade wins from detailed stats
  const getGradeWins = () => {
    if (!detailedStats?.grade_stats) return {};
    const wins = {};
    detailedStats.grade_stats.forEach((g) => {
      wins[g.grade] = g.tournaments_count || 0;
    });
    return wins;
  };

  const gradeWins = getGradeWins();
  const playerWinRate =
    player.total_games_count > 0
      ? Math.round((player.total_wins_count / player.total_games_count) * 100)
      : 0;

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      contentClassName="bg-dark text-light border-secondary"
      dialogClassName="modal-90w"
    >
      <Modal.Header closeButton closeVariant="white" className="border-secondary">
        <div className="w-100">
          <div className="d-flex align-items-center justify-content-between">
            {/* Left: Rank + Avatar + Name */}
            <div className="d-flex align-items-center">
              <div className="text-center mr-3" style={{ minWidth: "60px" }}>
                <div className={cn("badge fs-4 px-3 py-2", getPlaceBadgeClass(player.place))}>
                  {getMedalEmoji(player.place) || `#${player.place}`}
                </div>
              </div>
              {player.avatar_url && (
                <img
                  src={player.avatar_url}
                  alt={player.user_name}
                  className="rounded mr-3"
                  style={{ width: "48px", height: "48px" }}
                />
              )}
              <div>
                <h4 className="mb-0 text-white">{player.user_name}</h4>
                <div className="text-muted small">
                  {season?.name} {season?.year}
                  {player.clan_name && <span className="text-info ml-2">{player.clan_name}</span>}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="d-flex mr-5">
              <div className="text-center px-4">
                <div className="fs-4 fw-bold text-warning">
                  {player.total_points.toLocaleString()}
                </div>
                <div className="text-muted small text-uppercase">Points</div>
              </div>
              <div className="text-center px-4">
                <div className="fs-4 fw-bold text-success">{player.total_wins_count}</div>
                <div className="text-muted small text-uppercase">Wins</div>
              </div>
              <div className="text-center px-4">
                <div className="fs-4 fw-bold text-info">{player.tournaments_count}</div>
                <div className="text-muted small text-uppercase">Tournaments</div>
              </div>
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-0" style={{ maxHeight: "75vh", overflowY: "auto" }}>
        {/* Tabs */}
        <div className="d-flex justify-content-center p-3 border-bottom border-secondary sticky-top bg-dark">
          <button
            type="button"
            className={cn("btn btn-sm mr-2", {
              "btn-info": activeTab === "overview",
              "btn-outline-secondary": activeTab !== "overview",
            })}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={cn("btn btn-sm mr-2", {
              "btn-info": activeTab === "grades",
              "btn-outline-secondary": activeTab !== "grades",
            })}
            onClick={() => setActiveTab("grades")}
          >
            By Grade
          </button>
          <button
            type="button"
            className={cn("btn btn-sm mr-2", {
              "btn-info": activeTab === "tournaments",
              "btn-outline-secondary": activeTab !== "tournaments",
            })}
            onClick={() => setActiveTab("tournaments")}
          >
            Tournaments
          </button>
          <button
            type="button"
            className={cn("btn btn-sm", {
              "btn-info": activeTab === "trends",
              "btn-outline-secondary": activeTab !== "trends",
            })}
            onClick={() => setActiveTab("trends")}
          >
            Trends
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="info" />
            <p className="text-muted mt-2">Loading detailed stats...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="alert alert-warning m-3">{error}. Showing basic stats only.</div>
        )}

        {/* Tab Content */}
        {!loading && (
          <div className="p-3">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="row">
                {/* Left Column - Weapon + Stats */}
                <div className="col-md-5">
                  {/* Weapon Section */}
                  {player.user_lang && (
                    <div className="mb-4 text-center">
                      <h6 className="text-muted text-uppercase mb-3">Weapon</h6>
                      <LanguageIcon
                        lang={player.user_lang}
                        style={{ width: "80px", height: "80px" }}
                      />
                      <div className="fs-5 text-white text-capitalize mt-2">{player.user_lang}</div>
                    </div>
                  )}

                  {/* Stats List */}
                  <div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Season Rank</span>
                      <span className="fw-bold text-warning">
                        #{player.place}{" "}
                        <small className="text-muted">/ Top {100 - percentile}%</small>
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Total Points</span>
                      <span className="fw-bold text-warning">
                        {player.total_points.toLocaleString()}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Total Score</span>
                      <span className="fw-bold text-info">
                        {player.total_score.toLocaleString()}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Total Wins</span>
                      <span className="fw-bold text-success">{player.total_wins_count}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Total Games</span>
                      <span className="fw-bold">{player.total_games_count}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Tournaments</span>
                      <span className="fw-bold">{player.tournaments_count}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Best Finish</span>
                      <span>
                        {player.best_place ? (
                          <span className={cn("badge", getPlaceBadgeClass(player.best_place))}>
                            #{player.best_place}
                          </span>
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Avg Finish</span>
                      <span className="fw-bold">
                        #{player.avg_place ? Number(player.avg_place).toFixed(1) : "-"}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Time Played</span>
                      <span className="fw-bold">{formatTime(player.total_time)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Win Rate + Grades + Comparison */}
                <div className="col-md-7">
                  {/* Win Rate Chart */}
                  <WinRateChart wins={player.total_wins_count} total={player.total_games_count} />

                  {/* Tournaments by Grade */}
                  <div className="card cb-bg-panel border-0 mb-3 mt-3">
                    <div className="card-body">
                      <h6 className="text-muted text-uppercase mb-3">Tournaments by Grade</h6>
                      <div className="row">
                        {ALL_GRADES.map((grade) => (
                          <div key={grade} className="col-6 col-md-4">
                            <div className="d-flex align-items-center">
                              <span
                                className="fw-bold"
                                style={{ color: GRADE_COLORS[grade], minWidth: "90px" }}
                              >
                                {formatGradeName(grade)}
                              </span>
                              <span className="fw-bold text-white ml-2">
                                {gradeWins[grade] || 0}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick comparison with median */}
                  {medianStats && (
                    <div className="card cb-bg-panel border-0">
                      <div className="card-body">
                        <h6 className="text-muted text-uppercase mb-3">vs Median Player</h6>
                        <div className="row small">
                          <div className="col-6">
                            <span className="text-muted">Points: </span>
                            <span
                              className={cn(
                                "fw-bold",
                                player.total_points >= medianStats.points
                                  ? "text-success"
                                  : "text-danger",
                              )}
                            >
                              {player.total_points >= medianStats.points ? "+" : ""}
                              {(player.total_points - medianStats.points).toLocaleString()}
                            </span>
                          </div>
                          <div className="col-6">
                            <span className="text-muted">Win Rate: </span>
                            <span
                              className={cn(
                                "fw-bold",
                                playerWinRate >= medianStats.winRate
                                  ? "text-success"
                                  : "text-danger",
                              )}
                            >
                              {playerWinRate >= medianStats.winRate ? "+" : ""}
                              {(playerWinRate - medianStats.winRate).toFixed(1)}%
                            </span>
                          </div>
                          <div className="col-6">
                            <span className="text-muted">Wins: </span>
                            <span
                              className={cn(
                                "fw-bold",
                                player.total_wins_count >= medianStats.wins
                                  ? "text-success"
                                  : "text-danger",
                              )}
                            >
                              {player.total_wins_count >= medianStats.wins ? "+" : ""}
                              {player.total_wins_count - medianStats.wins}
                            </span>
                          </div>
                          <div className="col-6">
                            <span className="text-muted">Tournaments: </span>
                            <span
                              className={cn(
                                "fw-bold",
                                player.tournaments_count >= medianStats.tournaments
                                  ? "text-success"
                                  : "text-danger",
                              )}
                            >
                              {player.tournaments_count >= medianStats.tournaments ? "+" : ""}
                              {player.tournaments_count - medianStats.tournaments}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grades Tab */}
            {activeTab === "grades" && (
              <>
                <h6 className="text-muted text-uppercase mb-3">Tournament Performance by Grade</h6>
                {detailedStats?.grade_stats ? (
                  <>
                    <GradeStatsTable gradeStats={detailedStats.grade_stats} />
                    <div className="mt-4">
                      <GradeStatsChart gradeStats={detailedStats.grade_stats} />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted py-3">
                    {loading ? "Loading..." : "No grade stats available"}
                  </div>
                )}
              </>
            )}

            {/* Tournaments Tab */}
            {activeTab === "tournaments" && (
              <>
                <h6 className="text-muted text-uppercase mb-3">Tournament Results</h6>
                {detailedStats?.recent_tournaments ? (
                  <TournamentsTable tournaments={detailedStats.recent_tournaments} />
                ) : (
                  <div className="text-center text-muted py-3">
                    {loading ? "Loading..." : "No tournament data available"}
                  </div>
                )}
              </>
            )}

            {/* Trends Tab */}
            {activeTab === "trends" && (
              <>
                <h6 className="text-muted text-uppercase mb-3">Performance Over Time</h6>
                {detailedStats?.performance_trend && detailedStats.performance_trend.length > 0 ? (
                  <PerformanceTrendChart trend={detailedStats.performance_trend} />
                ) : (
                  <div className="text-center text-muted py-3">
                    {loading ? "Loading..." : "Not enough data for trend analysis"}
                  </div>
                )}

                {/* Comparison Charts with Median */}
                {medianStats && (
                  <div className="row mt-4">
                    {/* Radar Chart - Overall Comparison */}
                    <div className="col-md-6 mb-4">
                      <div className="card cb-bg-panel border-0 h-100">
                        <div className="card-body">
                          <h6 className="text-muted small text-uppercase">
                            Stats vs Median (Normalized)
                          </h6>
                          <ResponsiveContainer width="100%" height={250}>
                            <RadarChart
                              data={[
                                {
                                  stat: "Points",
                                  player: Math.min(
                                    (player.total_points / Math.max(medianStats.points, 1)) * 50,
                                    100,
                                  ),
                                  median: 50,
                                },
                                {
                                  stat: "Wins",
                                  player: Math.min(
                                    (player.total_wins_count / Math.max(medianStats.wins, 1)) * 50,
                                    100,
                                  ),
                                  median: 50,
                                },
                                {
                                  stat: "Win Rate",
                                  player: Math.min(
                                    (playerWinRate / Math.max(medianStats.winRate, 1)) * 50,
                                    100,
                                  ),
                                  median: 50,
                                },
                                {
                                  stat: "Score",
                                  player: Math.min(
                                    (player.total_score / Math.max(medianStats.score, 1)) * 50,
                                    100,
                                  ),
                                  median: 50,
                                },
                                {
                                  stat: "Tournaments",
                                  player: Math.min(
                                    (player.tournaments_count /
                                      Math.max(medianStats.tournaments, 1)) *
                                      50,
                                    100,
                                  ),
                                  median: 50,
                                },
                              ]}
                            >
                              <PolarGrid stroke="#444" />
                              <PolarAngleAxis
                                dataKey="stat"
                                stroke="#999"
                                tick={{ fontSize: 11 }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                              />
                              <Radar
                                name="You"
                                dataKey="player"
                                stroke="#0dcaf0"
                                fill="#0dcaf0"
                                fillOpacity={0.5}
                              />
                              <Radar
                                name="Median"
                                dataKey="median"
                                stroke="#6c757d"
                                fill="#6c757d"
                                fillOpacity={0.2}
                              />
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Bar Chart - Points Comparison */}
                    <div className="col-md-6 mb-4">
                      <div className="card cb-bg-panel border-0 h-100">
                        <div className="card-body">
                          <h6 className="text-muted small text-uppercase">Your Stats vs Median</h6>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart
                              data={[
                                {
                                  name: "Points",
                                  you: player.total_points,
                                  median: medianStats.points,
                                },
                                {
                                  name: "Score",
                                  you: player.total_score,
                                  median: medianStats.score,
                                },
                                {
                                  name: "Wins",
                                  you: player.total_wins_count,
                                  median: medianStats.wins,
                                },
                                {
                                  name: "Games",
                                  you: player.total_games_count,
                                  median: medianStats.games,
                                },
                              ]}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                              <XAxis type="number" stroke="#999" />
                              <YAxis type="category" dataKey="name" stroke="#999" width={60} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1a1a1a",
                                  border: "1px solid #333",
                                }}
                              />
                              <Legend />
                              <Bar dataKey="you" name="You" fill="#0dcaf0" />
                              <Bar dataKey="median" name="Median" fill="#6c757d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Win Rate Comparison */}
                    <div className="col-md-6 mb-4">
                      <div className="card cb-bg-panel border-0 h-100">
                        <div className="card-body">
                          <h6 className="text-muted small text-uppercase">Win Rate Comparison</h6>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={[
                                {
                                  name: "Win Rate %",
                                  you: playerWinRate,
                                  median: Math.round(medianStats.winRate),
                                },
                              ]}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                              <XAxis dataKey="name" stroke="#999" />
                              <YAxis stroke="#999" domain={[0, 100]} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1a1a1a",
                                  border: "1px solid #333",
                                }}
                                formatter={(value) => [`${value}%`, ""]}
                              />
                              <Legend />
                              <Bar dataKey="you" name="You" fill="#198754" />
                              <Bar dataKey="median" name="Median" fill="#6c757d" />
                              <ReferenceLine
                                y={50}
                                stroke="#ffc107"
                                strokeDasharray="3 3"
                                label={{ value: "50%", fill: "#ffc107", fontSize: 10 }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Percentile Gauge */}
                    <div className="col-md-6 mb-4">
                      <div className="card cb-bg-panel border-0 h-100">
                        <div className="card-body">
                          <h6 className="text-muted small text-uppercase">
                            Your Ranking Percentile
                          </h6>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: "Your Percentile", value: percentile, fill: "#0dcaf0" },
                                  { name: "Above You", value: 100 - percentile, fill: "#2d2d2d" },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                startAngle={180}
                                endAngle={0}
                                dataKey="value"
                              >
                                <Cell fill="#0dcaf0" />
                                <Cell fill="#2d2d2d" />
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1a1a1a",
                                  border: "1px solid #333",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="text-center" style={{ marginTop: "-60px" }}>
                            <div className="fs-3 fw-bold text-info">Top {100 - percentile}%</div>
                            <div className="text-muted small">
                              Better than {percentile}% of players
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Points distribution bar chart */}
                {detailedStats?.grade_stats && (
                  <div className="row mt-2">
                    <div className="col-md-6">
                      <div className="card cb-bg-panel border-0">
                        <div className="card-body">
                          <h6 className="text-muted small text-uppercase">
                            Points Distribution by Grade
                          </h6>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={ALL_GRADES.map((grade) => {
                                const gradeData = detailedStats.grade_stats.find(
                                  (g) => g.grade === grade,
                                );
                                return {
                                  name: formatGradeName(grade),
                                  points: gradeData?.total_points || 0,
                                  fill: GRADE_COLORS[grade],
                                };
                              })}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                              <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#999" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1a1a1a",
                                  border: "1px solid #333",
                                }}
                                formatter={(value) => [value.toLocaleString(), "Points"]}
                              />
                              <Bar dataKey="points" name="Points">
                                {ALL_GRADES.map((grade) => (
                                  <Cell key={`cell-${grade}`} fill={GRADE_COLORS[grade]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card cb-bg-panel border-0">
                        <div className="card-body">
                          <h6 className="text-muted small text-uppercase">Wins by Grade</h6>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={detailedStats.grade_stats.map((g) => ({
                                name: formatGradeName(g.grade),
                                wins: g.total_wins,
                                games: g.total_games,
                                fill: GRADE_COLORS[g.grade],
                              }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                              <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#999" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1a1a1a",
                                  border: "1px solid #333",
                                }}
                              />
                              <Bar dataKey="wins" name="Wins" fill="#198754" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default PlayerInsightsModal;
