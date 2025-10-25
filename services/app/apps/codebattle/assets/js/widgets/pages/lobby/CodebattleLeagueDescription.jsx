import React from 'react';

// Bootstrap 4 compatible, dark theme friendly (no bg-white / color backgrounds).
// Uses your custom dark styles like: cb-bg-panel, cb-bg-highlight-panel, cb-rounded, cb-btn-secondary, etc.

const CodebattleLeagueDescription = () => (
  <section className="container my-3">
    <div className="p-3 text-center">
      <h2 className="text-white m-0">Codebattle League</h2>
      <p className="text-white mt-2 mb-3">
        Challenge the best! Participate in the Competition tournaments, defeat
        your rivals to earn points, and claim the first place in the
        programmer ranking.
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
        See Rules & Details
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
                    Seasons, Grades, Points — Overview
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
                    <strong>Seasons</strong>
                  </p>
                  <ul className="mb-3 text-white">
                    <li>Season 0: Sep 21 – Dec 21</li>
                    <li>Season 1: Dec 21 – Mar 21</li>
                    <li>Season 2: Mar 21 – Jun 21</li>
                    <li>Season 3: Jun 21 – Sep 21</li>
                  </ul>
                  <ul className="mb-3 text-white">
                    <li>
                      On the season end date (the 21st), we run a
                      {' '}
                      <strong>Grand Slam</strong>
                      {' '}
                      at
                      {' '}
                      <strong>16:00 UTC</strong>
                      .
                    </li>
                    <li>
                      Season Points reset each season. Elo never resets
                      (lifetime).
                    </li>
                  </ul>
                  <p className="mb-2 text-white">
                    <strong>Grades</strong>
                  </p>
                  <p className="mb-0 text-white">
                    open, rookie, challenger, pro, elite, masters, grand_slam
                    — determine prestige, task pools, points, schedules, and
                    limits.
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
                    Tournament Scheduling & Preemption
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
                    <strong>Daily/Hourly (UTC)</strong>
                  </p>
                  <ul className="mb-3">
                    <li>
                      <strong>Rookie</strong>
                      : every 4 hours — 03:00, 07:00,
                      11:00, 15:00, 19:00, 23:00 UTC (no 16:00 slot).
                    </li>
                    <li>
                      <strong>Challenger</strong>
                      : daily 16:00 UTC; preempted
                      by higher grades that day/week.
                    </li>
                  </ul>
                  <p className="mb-2">
                    <strong>Weekly 16:00 UTC priority</strong>
                  </p>
                  <p className="mb-1">
                    grand_slam &gt; masters &gt; elite &gt; pro.
                  </p>
                  <p className="mb-0">
                    In any week, exactly one of these runs at 16:00. Grand
                    Slam week → only GS at 16:00. Masters week → no pro/elite.
                    Otherwise pro (Tue) and elite (Wed) alternate as backbone.
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
                    Player Limits & Rounds per Grade
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
                        <strong>Players limit</strong>
                      </p>
                      <ul className="mb-3">
                        <li>rookie: 8</li>
                        <li>challenger: 16</li>
                        <li>pro: 32</li>
                        <li>elite: 64</li>
                        <li>masters: 128</li>
                        <li>grand_slam: 256</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-2">
                        <strong>Rounds per grade</strong>
                      </p>
                      <ul className="mb-0">
                        <li>rookie: 4</li>
                        <li>challenger: 6</li>
                        <li>pro: 8</li>
                        <li>elite: 10</li>
                        <li>masters: 12</li>
                        <li>grand_slam: 14</li>
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
                    Season Points Distribution
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
                    For each finished tournament (grade ≠ open), award Season
                    Points by final place using the tables below. All
                    remaining participants (outside prize slots) receive
                    {' '}
                    <strong>2 points</strong>
                    {' '}
                    each. Prize points do not stack
                    with participation points.
                  </p>
                  <div className="row">
                    <div className="col-md-6">
                      <ul className="mb-3">
                        <li>
                          <strong>rookie</strong>
                          : [8, 4, 2] — top‑3
                        </li>
                        <li>
                          <strong>challenger</strong>
                          : [16, 8, 4, 2] — top‑6
                        </li>
                        <li>
                          <strong>pro</strong>
                          : [128, 64, 32, 16, 8, 4, 2] —
                          top‑7
                        </li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <ul className="mb-0">
                        <li>
                          <strong>elite</strong>
                          : [256, 128, 64, 32, 16, 8, 4,
                          2] — top‑8
                        </li>
                        <li>
                          <strong>masters</strong>
                          : [1024, 512, 256, 128, 64,
                          32, 16, 8, 4, 2] — top‑10
                        </li>
                        <li>
                          <strong>grand_slam</strong>
                          : [2048, 1024, 512, 256,
                          128, 64, 32, 16, 8, 4, 2] — top‑11
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
                    Season Leaderboard Tie‑Breakers
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
                    <li>Total Season Points (desc)</li>
                    <li>Tournament wins in season (desc)</li>
                    <li>Tournament participations in season (desc)</li>
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
                    Hall of Fame
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
                  Maintain a HoF for
                  {' '}
                  <strong>Season Champions</strong>
                  {' '}
                  and
                  {' '}
                  <strong>Grand Slam Champions</strong>
                  {' '}
                  (participants page
                  optional later).
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
                    Codebattle — Overview & Key Concepts
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
                    <strong>Competitive Programming Game</strong>
                  </p>
                  <p className="mb-3">
                    Codebattle (codebattle.hexlet.io) is a real‑time coding
                    duel platform. Two players solve the same task in
                    parallel; whoever solves it first wins the match.
                  </p>
                  <p className="mb-2">
                    <strong>Swiss Tournaments</strong>
                  </p>
                  <p className="mb-3">
                    Multiple rounds; in each round, players are paired vs
                    players with similar cumulative score; no repeat pairings
                    (unless unavoidable on round 1 bootstrap or via bot
                    fill‑ins).
                  </p>
                  <p className="mb-2">
                    <strong>Languages</strong>
                  </p>
                  <p className="mb-0">
                    16 supported — clojure, cpp, csharp, dart, elixir, golang,
                    haskell, java, js, kotlin, php, python, ruby, rust, swift,
                    ts.
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

export default CodebattleLeagueDescription;
