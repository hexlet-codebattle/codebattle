import React, { useState, useEffect } from 'react';

import axios from 'axios';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import sum from 'lodash/sum';
import { useDispatch } from 'react-redux';

import Loading from '../../components/Loading';
import langIconNames from '../../config/langIconNames';
import { actions } from '../../slices';
import CompletedGames from '../lobby/CompletedGames';

import Achievement from './Achievement';
import Heatmap from './Heatmap';
import UserStatCharts from './UserStatCharts';

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const userId = window.location.pathname.split('/').pop();

    axios
      .get(`/api/v1/user/${userId}/stats`)
      .then(response => {
        setUserData(camelizeKeys(response.data));
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, [dispatch]);

  if (!userData) {
    return <Loading />;
  }

  const { stats, user } = userData;
  const userInsertedAt = new Date(user.insertedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const gamesCount = sum(Object.values(stats.games));

  return (
    <div className="row">
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
            <hr />
            <h3 className="cb-heading">
              <span>Lang:</span>
              <img
                src={`/assets/images/achievements/${langIconNames[user.lang]}.png`}
                alt={user.lang}
                title={user.lang}
                width="30"
                height="30"
              />
            </h3>
            <hr />
            <p className="mb-2 small text-monospace text-muted">{`joined at ${userInsertedAt}`}</p>
            {user.githubName && (
              <h3 className="h1">
                <a
                  title="Github account"
                  className="text-muted"
                  href={`https://github.com/${user.githubName}`}
                >
                  <span className="fab fa-github" />
                </a>
              </h3>
            )}
            {user.achievements.length > 0 && (
              <>
                <hr className="mt-2" />
                <h3 className="text-break cb-heading">Achievements</h3>
                <div className="d-flex flex-wrap justify-content-start mt-3">
                  {user.achievements.map(item => <Achievement key={item} achievement={item} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="col-12 col-md-9 my-4">
        <div className="pr-md-2 min-h-100 d-flex flex-column">
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
          <div className="tab-content border border-top-0 flex-grow-1 basis-0" id="nav-tabContent">
            <div
              className="tab-pane fade show active"
              id="statistics"
              role="tabpanel"
              aria-labelledby="statistics-tab"
            >
              <div className="row mt-5 px-3 justify-content-center">
                {!user.isBot && (
                  <div className="col col-md-3 text-center">
                    <div className="h1 cb-stats-number">{user.rank}</div>
                    <p className="lead">rank</p>
                  </div>
                )}
                <div className="col col-md-3 text-center">
                  <div className="h1 cb-stats-number">{user.rating}</div>
                  <p className="lead">elo_rating</p>
                </div>
                <div className="col col-md-3 text-center">
                  <div className="h1 cb-stats-number">{gamesCount}</div>
                  <p className="lead">games_played</p>
                </div>
              </div>
              {gamesCount > 0 && <UserStatCharts stats={stats} />}
              <div className={cn('row mt-5 mb-md-3 mb-lg-4', { 'mt-lg-0': gamesCount > 0 })}>
                <div className="col-md-11 col-lg-10 mx-auto">
                  <Heatmap />
                </div>
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
