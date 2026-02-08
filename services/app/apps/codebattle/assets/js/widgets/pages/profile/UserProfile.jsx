import React, { useState, useEffect, useMemo } from 'react';

import axios from 'axios';
import { camelizeKeys } from 'humps';
import sum from 'lodash/sum';
import { useDispatch } from 'react-redux';

import LanguageIcon from '../../components/LanguageIcon';
import Loading from '../../components/Loading';
import { actions } from '../../slices';
import CompletedGames from '../lobby/CompletedGames';

import Achievement from './Achievement';
import Heatmap from './Heatmap';
import UserStatCharts from './UserStatCharts';
import UserTournaments from './UserTournaments';

const hiddenAchievementTypes = new Set(['game_stats', 'tournaments_stats']);
const seasonPlaceColors = {
  gold: '#e0bf7a',
  silver: '#c2c9d6',
  bronze: '#c48a57',
  platinum: '#a4aab3',
};

const getSeasonPlaceColor = (place) => {
  if (place === 1) return seasonPlaceColors.gold;
  if (place === 2) return seasonPlaceColors.silver;
  if (place === 3) return seasonPlaceColors.bronze;
  return seasonPlaceColors.platinum;
};

function HolopinTags({ name }) {
  return (
    name && (
      <div className="row mt-5 mb-md-3 mb-lg-4 mt-lg-0">
        <div className="position-relative col-lg-10 col-md-11 mx-auto">
          <div className="card cb-card">
            <div className="card-header py-1 cb-bg-highlight-panel font-weight-bold text-center">
              Holopins
            </div>
            <div className="card-body p-0">
              <a href={`https://holopin.io/@${name}`}>
                <img
                  src={`https://holopin.me/@${name}`}
                  alt={`@${name}'s Holopin board`}
                  className="w-100"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  );
}

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [topRivals, setTopRivals] = useState([]);
  const [rivalsStatus, setRivalsStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('statistics');
  const dispatch = useDispatch();
  const userId = useMemo(() => window.location.pathname.split('/').pop(), []);

  useEffect(() => {
    axios
      .get(`/api/v1/user/${userId}/stats`)
      .then((response) => {
        setUserData(camelizeKeys(response.data));
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  }, [dispatch, userId]);

  useEffect(() => {
    setRivalsStatus('loading');

    axios
      .get(`/api/v1/user/${userId}/rivals`)
      .then((response) => {
        const payload = camelizeKeys(response.data);
        setTopRivals(payload.topRivals || []);
        setRivalsStatus('loaded');
      })
      .catch(() => {
        setTopRivals([]);
        setRivalsStatus('error');
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
  const userInsertedAt = new Date(user.insertedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
              alt="User avatar"
            />
          </div>
          <div>
            <h1 className="cb-heading text-break font-weight-bold">{user.name}</h1>
            <hr className="cb-border-color" />
            <h3 className="cb-heading">
              <span>Lang:</span>
              <LanguageIcon
                className="ml-2"
                lang={user.lang}
                style={{ width: '30px', height: '30px' }}
              />
            </h3>
            <hr className="cb-border-color" />
            <div className="text-center">
              <p className="mb-1 small text-uppercase text-muted">Clan</p>
              {hasClan ? (
                <span className="cb-heading text-break font-weight-bold">
                  {user.clanId ? (
                    <a
                      className="text-decoration-none"
                      style={{ color: 'inherit' }}
                      href={`/clans/${user.clanId}`}
                    >
                      {user.clan}
                    </a>
                  ) : (
                    user.clan
                  )}
                </span>
              ) : (
                <span className="text-muted">No clan</span>
              )}
            </div>
            <hr className="cb-border-color" />
            <p className="mb-2 small text-monospace text-muted">{`joined at ${userInsertedAt}`}</p>
            {user.githubName && (
              <h3 className="h1">
                <a
                  title="Github account"
                  className="text-muted"
                  href={`https://github.com/${user.githubName}`}
                  aria-label="Github account"
                >
                  <span className="fab fa-github" />
                </a>
              </h3>
            )}
            {visibleAchievements.length > 0 && (
              <>
                <hr className="mt-2" />
                <h3 className="text-break cb-heading">Achievements</h3>
                <div className="cb-achievements-grid mt-3">
                  {visibleAchievements.map((item) => <Achievement key={item.type} achievement={item} />)}
                </div>
              </>
            )}
            {seasonResults.length > 0 && (
              <>
                <hr className="mt-3" />
                <h3 className="text-break cb-heading">Seasons</h3>
                <div className="mt-2 text-left">
                  {seasonResults.map((result) => (
                    <div
                      key={result.seasonId}
                      className="mb-2 p-2 cb-rounded"
                      style={{
                        backgroundColor: getSeasonPlaceColor(result.place),
                        border: '1px solid rgba(47, 52, 64, 0.25)',
                      }}
                    >
                      <div className="font-weight-bold">
                        <a
                          href={`/seasons/${result.seasonId}`}
                          className="text-decoration-none"
                          style={{ color: '#2f3440' }}
                        >
                          {`${result.seasonName} ${result.seasonYear}`}
                        </a>
                      </div>
                      <div className="small" style={{ color: '#2f3440' }}>{`Place: #${result.place}`}</div>
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
                onClick={() => setActiveTab('statistics')}
              >
                Statistics
              </a>
              <a
                className="nav-item nav-link text-uppercase border-0 text-center font-weight-bold rounded-0 flex-fill p-3"
                id="tournaments-tab"
                data-toggle="tab"
                href="#tournaments"
                role="tab"
                aria-controls="tournaments"
                aria-selected="false"
                onClick={() => setActiveTab('tournaments')}
              >
                Tournaments
              </a>
              <a
                className="nav-item nav-link text-uppercase border-0 text-center font-weight-bold rounded-0 flex-fill p-3"
                id="completedGames-tab"
                data-toggle="tab"
                href="#completedGames"
                role="tab"
                aria-controls="completedGames"
                aria-selected="false"
                onClick={() => setActiveTab('completedGames')}
              >
                Completed games
              </a>
            </div>
          </nav>
          <div className="tab-content border cb-border-color border-top-0 rounded-bottom flex-grow-1 basis-0" id="nav-tabContent">
            <div
              className="tab-pane fade show active"
              id="statistics"
              role="tabpanel"
              aria-labelledby="statistics-tab"
            >
              <div className="row mt-5 px-3 justify-content-center">
                <div className="col col-md-3 text-center">
                  <div className="h1 cb-stats-number">{user.rating}</div>
                  <p className="lead">(Elo Rating)</p>
                </div>
                {!user.isBot && (
                  <div className="col col-md-3 text-center">
                    <div className="h1 cb-stats-number">{`#${user.rank}`}</div>
                    <p className="lead">Place</p>
                  </div>
                )}
                <div className="col col-md-3 text-center">
                  <div className="h1 cb-stats-number">{user.points || 0}</div>
                  <p className="lead">Points</p>
                </div>
              </div>
              {hasChartsData && (
                <UserStatCharts
                  gameStats={gameStats}
                  tournamentStats={tournamentStats}
                />
              )}
              {rivalsStatus === 'loading' && (
                <div className="row mt-5 px-3 justify-content-center">
                  <div className="col-12 col-lg-10">
                    <div className="small text-center text-muted mb-2">Rivals</div>
                    <Loading small />
                  </div>
                </div>
              )}
              {rivalsStatus === 'loaded' && topRivals.length > 0 && (
                <div className="row mt-5 px-3 justify-content-center">
                  <div className="col-12 col-lg-10">
                    <div className="small text-center text-muted mb-2">Rivals</div>
                    <div className="d-flex flex-wrap justify-content-center">
                      {topRivals.map((rival) => (
                        <a
                          key={rival.id}
                          href={`/users/${rival.id}`}
                          className="m-1 px-3 py-2 cb-rounded font-weight-bold text-decoration-none d-block"
                          style={{
                            backgroundColor: '#c2c9d6',
                            border: '1px solid #a4aab3',
                            color: '#2f3440',
                            minWidth: '180px',
                            textAlign: 'center',
                          }}
                        >
                          <div>{rival.name}</div>
                          <div className="small">{`Clan: ${rival.clan || '-'}`}</div>
                          <div className="small">{`W/L/T: ${rival.winsCount}/${rival.lossesCount}/${rival.timeoutsCount}`}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {languageGamesCount > 0 && (
                <div className="row mt-5 px-3 justify-content-center">
                  <div className="col-12 col-lg-10">
                    <div className="small text-center text-muted mb-2">Languages</div>
                    <div className="d-flex flex-wrap justify-content-center">
                      {languageEntries.map(([lang, count]) => (
                        <div
                          key={lang}
                          className="m-1 px-3 py-2 cb-rounded font-weight-bold"
                          style={{
                            backgroundColor: '#c2c9d6',
                            border: '1px solid #a4aab3',
                            color: '#2f3440',
                            minWidth: '88px',
                            textAlign: 'center',
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
                <div className="col-md-11 col-lg-10 mx-auto">
                  <Heatmap />
                </div>
              </div>
              <HolopinTags name={user?.githubName} />
            </div>
            <div
              className="tab-pane fade min-h-100"
              id="tournaments"
              role="tabpanel"
              aria-labelledby="tournaments-tab"
            >
              <div className="h-100 d-flex flex-column justify-content-center">
                <UserTournaments isActive={activeTab === 'tournaments'} />
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
