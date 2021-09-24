import { camelizeKeys } from 'humps';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { actions } from '../slices';
import CompletedGames from '../components/Game/CompletedGames';
import Heatmap from './Heatmap';
import Loading from '../components/Loading';

const getUserAvatarUrl = ({ githubId, discordId, discordAvatar }) => {
  if (githubId) {
    return `https://avatars0.githubusercontent.com/u/${githubId}`;
  }

  if (discordId) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}`;
  }

  return 'https://avatars0.githubusercontent.com/u/35539033';
};

const UserProfile = () => {
  const [stats, setStats] = useState(null);

  const dispatch = useDispatch();

  useEffect(() => {
    const userId = window.location.pathname.split('/').pop();

    axios
      .get(`/api/v1/user/${userId}/stats`)
      .then(response => {
        setStats(camelizeKeys(response.data));
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, [dispatch]);

  const renderAchievemnt = achievement => {
    if (achievement.includes('win_games_with')) {
      const langs = achievement.split('?').pop().split('_');

      return (
        <div className="cb-polyglot mr-1 mb-1" title={achievement}>
          <div className="d-flex h-75 flex-wrap align-items-center justify-content-around">
            {langs.map(lang => (
              <img
                src={`/assets/images/achievements/${lang}.png`}
                alt={lang}
                title={lang}
                width="10"
                height="10"
                key={lang}
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <img
        className="mr-1 mb-1"
        src={`/assets/images/achievements/${achievement}.png`}
        alt={achievement}
        title={achievement}
        width="50"
        height="50"
      />
    );
  };
  if (!stats) {
    return <Loading />;
  }

  const dateParse = date => new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const renderStatistics = () => (
    <>
      <div className="row my-4 justify-content-center">
        <div className="col-md-3 text-center">
          <div className="h1">{stats.user.rank}</div>
          <p className="lead">rank</p>
        </div>
        <div className="col-md-3 text-center">
          <div className="h1">{stats.user.rating}</div>
          <p className="lead">elo_rating</p>
        </div>
        <div className="col-md-3 text-center">
          <div className="h1">{stats.stats.won + stats.stats.lost + stats.stats.gaveUp}</div>
          <p className="lead">games_played</p>
        </div>
      </div>
      <div className="row my-4 justify-content-center">
        <div className="col-3 col-lg-2 text-center">
          <div className="h1">{stats.stats.won}</div>
          <p className="lead">won</p>
        </div>
        <div className="col-3 col-lg-2 text-center border-left border-right">
          <div className="h1">{stats.stats.lost}</div>
          <p className="lead">lost</p>
        </div>
        <div className="col-3 col-lg-2 text-center">
          <div className="h1">{stats.stats.gaveUp}</div>
          <p className="lead">gave up</p>
        </div>
      </div>
      <div className="row my-4 justify-content-center">
        <div className="col-10 col-lg-8">
          <Heatmap />
        </div>
      </div>
    </>
  );

  const renderCompletedGames = () => (
    <div className="row justify-content-center">
      <div className="col-11">
        <div className="text-left my-5">
          {stats.completedGames.length > 0 && (
          <>
            <CompletedGames games={stats.completedGames} />
          </>
              )}
        </div>
      </div>
    </div>
  );

  const statContainers = () => (
    <div className="border">
      <nav>
        <div className="nav nav-tabs bg-gray" id="nav-tab" role="tablist">
          <a
            className="nav-item nav-link active text-uppercase rounded-0 text-black font-weight-bold p-3"
            id="statistics-tab"
            data-toggle="tab"
            href="#statistics"
            role="tab"
            aria-controls="statistics"
            aria-selected="true"
          >
            Statistics
          </a>
          <a
            className="nav-item nav-link text-uppercase rounded-0 text-black font-weight-bold p-3"
            id="completedGames-tab"
            data-toggle="tab"
            href="#completedGames"
            role="tab"
            aria-controls="completedGames"
            aria-selected="false"
          >
            Completed games
          </a>
        </div>
      </nav>
      <div className="tab-content" id="nav-tabContent">
        <div
          className="tab-pane fade show active"
          id="statistics"
          role="tabpanel"
          aria-labelledby="statistics-tab"
        >
          {renderStatistics()}
        </div>
        <div
          className="tab-pane fade"
          id="completedGames"
          role="tabpanel"
          aria-labelledby="completedGames-tab"
        >
          {renderCompletedGames()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-lg">
      <div className="row">
        <div className="col-12 col-md-3 my-4">
          <div className="mb-4">
            <img
              className="attachment user avatar img-fluid rounded"
              src={getUserAvatarUrl(stats.user)}
              alt={stats.user.name}
            />
          </div>
          <h2 className="my-2">{stats.user.name}</h2>
          <h3 className="my-2">{`Lang: ${stats.user.lang}`}</h3>
          <hr />
          <p className="small text-monospace text-muted mb-2">
            {'joined at '}
            {dateParse(stats.user.insertedAt)}
          </p>
          <h1 className="my-2">
            {stats.user.githubName && (
            <a
              className="text-muted"
              href={`https://github.com/${stats.user.githubName}`}
            >
              <span className="fab fa-github pr-3" />
            </a>
              )}
          </h1>
          <div className="my-2">
            {stats.user.achievements.length > 0 && (
              <>
                <hr className="mt-2" />
                <h5 className="text-break">Achievements</h5>
                <div className="col d-flex flex-wrap justify-content-start cb-profile mt-3 pl-0">
                  {stats.user.achievements.map(achievement => (
                    <div key={achievement}>{renderAchievemnt(achievement)}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="col-12 col-md-9 my-4">
          {statContainers()}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
