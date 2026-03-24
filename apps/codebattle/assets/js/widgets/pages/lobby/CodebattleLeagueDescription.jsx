import React from "react";

import i18n from "../../../i18n";

// Bootstrap 4 compatible, dark theme friendly (no bg-white / color backgrounds).
// Uses your custom dark styles like: cb-bg-panel, cb-bg-highlight-panel, cb-rounded, cb-btn-secondary, etc.

function CodebattleLeagueDescription() {
  return (
    <section className="w-100 my-2 cb-league-description">
      <div className="px-2 px-md-3 py-3 text-center">
        <h2 className="text-white m-0">{i18n.t("Codebattle League")}</h2>
        <p className="text-white mt-2 mb-3">
          {i18n.t(
            "Challenge the best! Participate in the Competition tournaments, defeat your rivals to earn points, and claim the first place in the programmer ranking.",
          )}
        </p>

        {/* Toggle for Rules/Details */}
        <button
          className="btn btn-secondary cb-btn-secondary cb-rounded"
          type="button"
          data-toggle="collapse"
          data-target="#leagueProtocol"
          aria-expanded="false"
          aria-controls="leagueProtocol"
        >
          {i18n.t("See Rules & Details")}
        </button>

        {/* Collapsible rules container */}
        <div className="collapse mt-3 text-left" id="leagueProtocol">
          <div className="cb-bg-highlight-panel cb-rounded p-2">
            <div id="leagueAccordion">
              {/* Overview */}
              <div className="card cb-bg-panel cb-rounded mb-2">
                <div className="card-header" id="headingOverview">
                  <h5 className="mb-0">
                    <button
                      className="btn btn-link text-uppercase"
                      type="button"
                      data-toggle="collapse"
                      data-target="#collapseOverview"
                      aria-expanded="true"
                      aria-controls="collapseOverview"
                    >
                      {i18n.t("Seasons, Grades, Points — Overview")}
                    </button>
                  </h5>
                </div>
                <div
                  id="collapseOverview"
                  className="collapse show"
                  aria-labelledby="headingOverview"
                  data-parent="#leagueAccordion"
                >
                  <div className="card-body">
                    <p className="mb-2 text-white">
                      <strong>{i18n.t("Seasons")}</strong>
                    </p>
                    <ul className="mb-3 text-white">
                      <li>{i18n.t("Season 0: Sep 21 – Dec 21")}</li>
                      <li>{i18n.t("Season 1: Dec 21 – Mar 21")}</li>
                      <li>{i18n.t("Season 2: Mar 21 – Jun 21")}</li>
                      <li>{i18n.t("Season 3: Jun 21 – Sep 21")}</li>
                    </ul>
                    <ul className="mb-3 text-white">
                      <li>
                        {i18n.t(
                          "On the season end date (the 21st), we run a Grand Slam at 16:00 UTC.",
                        )}
                      </li>
                      <li>
                        {i18n.t("Season Points reset each season. Elo never resets (lifetime).")}
                      </li>
                    </ul>
                    <p className="mb-2 text-white">
                      <strong>{i18n.t("Grades")}</strong>
                    </p>
                    <p className="mb-0 text-white">
                      {i18n.t(
                        "open, rookie, challenger, pro, elite, masters, grand_slam — determine prestige, task pools, points, schedules, and limits.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scheduling & Preemption */}
              <div className="card cb-bg-panel cb-rounded mb-2">
                <div className="card-header" id="headingSchedule">
                  <h5 className="mb-0">
                    <button
                      className="btn btn-link collapsed text-uppercase"
                      type="button"
                      data-toggle="collapse"
                      data-target="#collapseSchedule"
                      aria-expanded="false"
                      aria-controls="collapseSchedule"
                    >
                      {i18n.t("Tournament Scheduling & Preemption")}
                    </button>
                  </h5>
                </div>
                <div
                  id="collapseSchedule"
                  className="collapse"
                  aria-labelledby="headingSchedule"
                  data-parent="#leagueAccordion"
                >
                  <div className="card-body text-white">
                    <p className="mb-2">
                      <strong>{i18n.t("Daily/Hourly (UTC)")}</strong>
                    </p>
                    <ul className="mb-3">
                      <li>
                        {i18n.t(
                          "Rookie: every 4 hours — 03:00, 07:00, 11:00, 15:00, 19:00, 23:00 UTC (no 16:00 slot).",
                        )}
                      </li>
                      <li>
                        {i18n.t(
                          "Challenger: daily 16:00 UTC; preempted by higher grades that day/week.",
                        )}
                      </li>
                    </ul>
                    <p className="mb-2">
                      <strong>{i18n.t("Weekly 16:00 UTC priority")}</strong>
                    </p>
                    <p className="mb-1">{i18n.t("grand_slam > masters > elite > pro.")}</p>
                    <p className="mb-0">
                      {i18n.t(
                        "In any week, exactly one of these runs at 16:00. Grand Slam week -> only GS at 16:00. Masters week -> no pro/elite. Otherwise pro (Tue) and elite (Wed) alternate as backbone.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Player Limits & Rounds */}
              <div className="card cb-bg-panel cb-rounded mb-2">
                <div className="card-header" id="headingLimits">
                  <h5 className="mb-0">
                    <button
                      className="btn btn-link collapsed text-uppercase"
                      type="button"
                      data-toggle="collapse"
                      data-target="#collapseLimits"
                      aria-expanded="false"
                      aria-controls="collapseLimits"
                    >
                      {i18n.t("Player Limits & Rounds per Grade")}
                    </button>
                  </h5>
                </div>
                <div
                  id="collapseLimits"
                  className="collapse"
                  aria-labelledby="headingLimits"
                  data-parent="#leagueAccordion"
                >
                  <div className="card-body text-white">
                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-2">
                          <strong>{i18n.t("Players limit")}</strong>
                        </p>
                        <ul className="mb-3">
                          <li>{i18n.t("rookie: 8")}</li>
                          <li>{i18n.t("challenger: 16")}</li>
                          <li>{i18n.t("pro: 32")}</li>
                          <li>{i18n.t("elite: 64")}</li>
                          <li>{i18n.t("masters: 128")}</li>
                          <li>{i18n.t("grand_slam: 256")}</li>
                        </ul>
                      </div>
                      <div className="col-md-6">
                        <p className="mb-2">
                          <strong>{i18n.t("Rounds per grade")}</strong>
                        </p>
                        <ul className="mb-0">
                          <li>{i18n.t("rookie: 4")}</li>
                          <li>{i18n.t("challenger: 6")}</li>
                          <li>{i18n.t("pro: 8")}</li>
                          <li>{i18n.t("elite: 10")}</li>
                          <li>{i18n.t("masters: 12")}</li>
                          <li>{i18n.t("grand_slam: 14")}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Season Points Distribution */}
              <div className="card cb-bg-panel cb-rounded mb-2">
                <div className="card-header" id="headingPoints">
                  <h5 className="mb-0">
                    <button
                      className="btn btn-link collapsed text-uppercase"
                      type="button"
                      data-toggle="collapse"
                      data-target="#collapsePoints"
                      aria-expanded="false"
                      aria-controls="collapsePoints"
                    >
                      {i18n.t("Season Points Distribution")}
                    </button>
                  </h5>
                </div>
                <div
                  id="collapsePoints"
                  className="collapse"
                  aria-labelledby="headingPoints"
                  data-parent="#leagueAccordion"
                >
                  <div className="card-body text-white">
                    <p>
                      {i18n.t(
                        "For each finished tournament (grade != open), award Season Points by final place using the tables below. All remaining participants (outside prize slots) receive 2 points each. Prize points do not stack with participation points.",
                      )}
                    </p>
                    <div className="row">
                      <div className="col-md-6">
                        <ul className="mb-3">
                          <li>{i18n.t("rookie: [8, 4, 2] - top-3")}</li>
                          <li>{i18n.t("challenger: [16, 8, 4, 2] - top-6")}</li>
                          <li>{i18n.t("pro: [128, 64, 32, 16, 8, 4, 2] - top-7")}</li>
                        </ul>
                      </div>
                      <div className="col-md-6">
                        <ul className="mb-0">
                          <li>{i18n.t("elite: [256, 128, 64, 32, 16, 8, 4, 2] - top-8")}</li>
                          <li>
                            {i18n.t("masters: [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] - top-10")}
                          </li>
                          <li>
                            {i18n.t(
                              "grand_slam: [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] - top-11",
                            )}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tie-Breakers */}
              <div className="card cb-bg-panel cb-rounded mb-2">
                <div className="card-header" id="headingTie">
                  <h5 className="mb-0">
                    <button
                      className="btn btn-link collapsed text-uppercase"
                      type="button"
                      data-toggle="collapse"
                      data-target="#collapseTie"
                      aria-expanded="false"
                      aria-controls="collapseTie"
                    >
                      {i18n.t("Season Leaderboard Tie-Breakers")}
                    </button>
                  </h5>
                </div>
                <div
                  id="collapseTie"
                  className="collapse"
                  aria-labelledby="headingTie"
                  data-parent="#leagueAccordion"
                >
                  <div className="card-body text-white">
                    <ol className="mb-0">
                      <li>{i18n.t("Total Season Points (desc)")}</li>
                      <li>{i18n.t("Tournament wins in season (desc)")}</li>
                      <li>{i18n.t("Tournament participations in season (desc)")}</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Hall of Fame */}
              <div className="card cb-bg-panel cb-rounded mb-2">
                <div className="card-header" id="headingHof">
                  <h5 className="mb-0">
                    <button
                      className="btn btn-link collapsed text-uppercase"
                      type="button"
                      data-toggle="collapse"
                      data-target="#collapseHof"
                      aria-expanded="false"
                      aria-controls="collapseHof"
                    >
                      {i18n.t("Hall of Fame")}
                    </button>
                  </h5>
                </div>
                <div
                  id="collapseHof"
                  className="collapse"
                  aria-labelledby="headingHof"
                  data-parent="#leagueAccordion"
                >
                  <div className="card-body text-white">
                    {i18n.t(
                      "Maintain a HoF for Season Champions and Grand Slam Champions (participants page optional later).",
                    )}
                  </div>
                </div>
              </div>

              {/* Codebattle — Overview & Key Concepts */}
              <div className="card cb-bg-panel cb-rounded mb-2">
                <div className="card-header" id="headingCbOverview">
                  <h5 className="mb-0">
                    <button
                      className="btn btn-link collapsed text-uppercase"
                      type="button"
                      data-toggle="collapse"
                      data-target="#collapseCbOverview"
                      aria-expanded="false"
                      aria-controls="collapseCbOverview"
                    >
                      {i18n.t("Codebattle - Overview & Key Concepts")}
                    </button>
                  </h5>
                </div>
                <div
                  id="collapseCbOverview"
                  className="collapse"
                  aria-labelledby="headingCbOverview"
                  data-parent="#leagueAccordion"
                >
                  <div className="card-body text-white">
                    <p className="mb-2">
                      <strong>{i18n.t("Competitive Programming Game")}</strong>
                    </p>
                    <p className="mb-3">
                      {i18n.t(
                        "Codebattle (codebattle.hexlet.io) is a real-time coding duel platform. Two players solve the same task in parallel; whoever solves it first wins the match.",
                      )}
                    </p>
                    <p className="mb-2">
                      <strong>{i18n.t("Swiss Tournaments")}</strong>
                    </p>
                    <p className="mb-3">
                      {i18n.t(
                        "Multiple rounds; in each round, players are paired vs players with similar cumulative score; no repeat pairings (unless unavoidable on round 1 bootstrap or via bot fill-ins).",
                      )}
                    </p>
                    <p className="mb-2">
                      <strong>{i18n.t("Languages")}</strong>
                    </p>
                    <p className="mb-0">
                      {i18n.t(
                        "16 supported - clojure, cpp, csharp, dart, elixir, golang, java, js, kotlin, php, python, ruby, rust, swift, zig, ts.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CodebattleLeagueDescription;
