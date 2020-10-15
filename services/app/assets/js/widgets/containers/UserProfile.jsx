import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { camelizeKeys } from 'humps';
import Loading from '../components/Loading';
import Heatmap from './Heatmap';
import CompletedGames from '../components/Game/CompletedGames';

const UserProfile = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const userId = window.location.pathname.split('/').pop();
    axios.get(`/api/v1/user/${userId}/stats`).then(response => {
      setStats(camelizeKeys(response.data));
    });
  }, [setStats]);

  const renderAchievemnt = achievement => {
    if (achievement.includes('win_games_with')) {
      const langs = achievement.split('?').pop().split('_');

      return (
        <div className="cb-polyglot" title={achievement}>
          <div className="d-flex h-75 flex-wrap align-items-center justify-content-around">
            {langs.map(lang => (
              <img
                src={`/assets/images/achievements/${lang}.png`}
                alt={lang}
                title={lang}
                width="38"
                height="38"
                key={lang}
              />
            ))}
          </div>
        </div>
      );
    }
      return (
        <img
          className="mr-1"
          src={`/assets/images/achievements/${achievement}.png`}
          alt={achievement}
          title={achievement}
          width="200"
          height="200"
        />
      );
  };
  if (!stats) {
    return <Loading />;
  }
  return (
    <div className="text-center">
      <div className="container bg-white">
        <div className="row">
          <div className="col-12 text-center mt-4">
            <div className="row">
              <div className="col-10 col-sm-4 col-md-2 m-auto">
                <img
                  className="attachment user avatar img-fluid rounded"
                  src={`https://avatars0.githubusercontent.com/u/${stats.user.githubId}`}
                  alt={stats.user.name}
                />
              </div>
            </div>
            <h1 className="mt-1 mb-0">
              {stats.user.name}
              <a
                className="text-muted"
                href={`https://github.com/${stats.user.githubName}`}
              >
                <span className="fab fa-github mt-5 pl-3" />
              </a>
            </h1>
            <h2 className="mt-1 mb-0">{`Lang: ${stats.user.lang}`}</h2>
          </div>
        </div>
        <div className="row px-4 mt-5 justify-content-center">
          <div className="col-6">
            <Heatmap />
          </div>
        </div>
        <div className="row px-4 mt-5 justify-content-center">
          <div className="col-12 col-md-4 col-lg-2 text-center">
            <div className="h1">{stats.rank}</div>
            <p className="lead">rank</p>
          </div>
          <div className="col-12 col-md-4 col-lg-2 text-center">
            <div className="h1">{stats.user.rating}</div>
            <p className="lead">elo_rating</p>
          </div>
          <div className="col-12 col-md-5 col-lg-3 text-center">
            <div className="h1">{`${stats.stats.won}::${stats.stats.lost}::${stats.stats.gaveUp}`}</div>
            <p className="lead">won::lost::gave up</p>
          </div>
          <div className="col-12 col-md-4 col-lg-2 text-center">
            <div className="h1">
              {stats.stats.won + stats.stats.lost + stats.stats.gaveUp}
            </div>
            <p className="lead">games_played</p>
          </div>
        </div>
        <div className="row">
          <div className="col-12 mt-4">
            {stats.user.achievements.length > 0
              && (
              <>
                <h2 className="mt-1 mb-0">Achievements</h2>
                <div className="d-flex justify-content-center cb-profile mt-4">
                  {stats.user.achievements.map(achievement => (
                    <div key={achievement}>{renderAchievemnt(achievement)}</div>
                  ))}
                </div>
              </>
)}
            <div className="text-left mt-5">
              {stats.completedGames.length > 0
              && (
              <>
                <h2 className="text-center">Completed games</h2>
                <CompletedGames games={stats.completedGames} />
              </>
)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
