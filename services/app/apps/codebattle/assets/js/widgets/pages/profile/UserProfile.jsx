import React, { useState, useEffect } from 'react';

import axios from 'axios';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import sum from 'lodash/sum';
import { useDispatch, useSelector } from 'react-redux';

import Loading from '../../components/Loading';
import langIconNames from '../../config/langIconNames';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import { fetchCompletedGames, loadNextPage } from '../../slices/completedGames';
import CompletedGames from '../lobby/CompletedGames';

import Heatmap from './Heatmap';
import UserStatCharts from './UserStatCharts';

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const { completedGames, totalGames } = useSelector(selectors.completedGamesData);
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

  useEffect(() => {
    dispatch(fetchCompletedGames());
  }, [dispatch]);

  const dateParse = date => new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const renderAchivement = achievement => {
    if (achievement.includes('win_games_with')) {
      const langs = achievement.split('?').pop().split('_');

      return (
        <div className="cb-polyglot mr-1 mb-1" title={achievement}>
          <div className="d-flex h-75 flex-wrap align-items-center justify-content-around cb-polyglot-icons">
            {langs.map(lang => (
              <img
                src={`/assets/images/achievements/${lang}.png`}
                alt={lang}
                title={lang}
                width="14"
                height="14"
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
        width="65"
        height="65"
      />
    );
  };

  if (!userData) {
    return <Loading />;
  }

  const { stats, user } = userData;
  const gamesCount = sum(Object.values(stats.games));

  const renderCompletedGames = () => (
    <div className="row justify-content-center">
      <div className="col-12">
        <div className="text-left">
          {completedGames && completedGames.length > 0 && (
            <>
              <CompletedGames
                className="table-responsive scroll h-75"
                games={completedGames}
                loadNextPage={loadNextPage}
                totalGames={totalGames}
              />
            </>
          )}
          {completedGames && completedGames.length === 0 && (
            <>
              <div
                style={{ height: 498 }}
                className="d-flex align-items-center justify-content-center border text-muted"
              >
                No completed games
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

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
            <h2 className="my-2 text-break cb-heading font-weight-bold">{user.name}</h2>
            <hr />
            <h3 className="my-2 cb-heading">
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
            <p className="small text-monospace text-muted mb-2">
              {'joined at '}
              {dateParse(user.insertedAt)}
            </p>
            <h1 className="my-2">
              {user.githubName && (
                <a
                  title="Github account"
                  className="text-muted"
                  href={`https://github.com/${user.githubName}`}
                >
                  <span className="fab fa-github" />
                </a>
              )}
            </h1>
            <div className="my-2">
              {user.achievements.length > 0 && (
                <>
                  <hr className="mt-2" />
                  <h5 className="text-break cb-heading">Achievements</h5>
                  <div className="col d-flex flex-wrap justify-content-start cb-profile mt-3 pl-0">
                    {user.achievements.map(achievement => (
                      <div key={achievement}>
                        {renderAchivement(achievement)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="col-12 col-md-9 my-4">
        <div className="pr-md-2">
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
              className="tab-pane fade border show active"
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
              className="tab-pane fade"
              id="completedGames"
              role="tabpanel"
              aria-labelledby="completedGames-tab"
            >
              {renderCompletedGames()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
