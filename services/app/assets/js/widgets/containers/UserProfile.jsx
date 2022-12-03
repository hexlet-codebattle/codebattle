import { camelizeKeys } from 'humps';
import { useDispatch, useSelector } from 'react-redux';
import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import axios from 'axios';
// import classnames from 'classnames';

import { actions } from '../slices';
import { fetchCompletedGames, loadNextPage } from '../slices/completedGames';
import CompletedGames from '../components/Game/CompletedGames';
import Heatmap from './Heatmap';
import Loading from '../components/Loading';

const UserProfile = () => {
  const [stats, setStats] = useState(null);
  const [chartFilter, setChartFilter] = useState('getAllGames');
  const completedGames = useSelector(
    state => state.completedGames.completedGames,
  );

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

  if (!stats) {
    return <Loading />;
  }

  const CustomPieChart = () => {
    if (!stats.stats) {
      return <Loading />;
    }
    if (stats.stats.all.length <= 1) {
      return <></>;
    }

    const handlerOnChangeChart = id => () => {
      setChartFilter(id);
    };

    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const gamesByLang = stats.stats.all.reduce(
      (acc, { lang }) => ({
        ...acc,
        [lang]: {
          won: 0,
          lost: 0,
          gave_up: 0,
          getWonGames() {
            return this.won;
          },
          getLostGames() {
            return this.lost;
          },
          getGaveUpGames() {
            return this.gave_up;
          },
          getAllGames() {
            return this.won + this.lost + this.gave_up;
          },
        },
      }),
      {},
    );

    stats.stats.all.forEach(
      ({ count, lang, result }) => (gamesByLang[lang] = { ...gamesByLang[lang], [result]: count }),
    );

    const dataForPie = Object.entries(gamesByLang).map(([key, value]) => ({
      name: key,
      value: value[chartFilter](),
    }));

    return (
      <div style={{ width: '100%', height: 400 }}>
        <div className="d-flex justify-content-center">
          {stats.stats.games.won !== 0 && (
            <div className="px-2">
              <input
                id="won"
                type="radio"
                name="gameResults"
                onChange={handlerOnChangeChart('getWonGames')}
                value="getWonGames"
                checked={chartFilter === 'getWonGames'}
              />
              <label htmlFor="won">won</label>
            </div>
          )}
          {stats.stats.games.lost !== 0 && (
            <div className="px-2">
              <input
                id="lost"
                type="radio"
                onChange={handlerOnChangeChart('getLostGames')}
                name="gameResults"
                value="getLostGames"
                checked={chartFilter === 'getLostGames'}
              />
              <label htmlFor="lost">lost</label>
            </div>
          )}
          {stats.stats.games.gaveUp !== 0 && (
            <div className="px-2">
              <input
                id="gaveup"
                type="radio"
                onChange={handlerOnChangeChart('getGaveUpGames')}
                name="gameResults"
                value="getGaveUpGames"
                checked={chartFilter === 'getGaveUpGames'}
              />
              <label htmlFor="gaveup">gave up</label>
            </div>
          )}
          <div className="px-2">
            <input
              id="all"
              type="radio"
              onChange={handlerOnChangeChart('getAllGames')}
              name="gameResults"
              value="getAllGames"
              checked={chartFilter === 'getAllGames'}
            />
            <label htmlFor="all">all</label>
          </div>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                dataKey="value"
                data={dataForPie}
                labelLine={false}
                label
                position="inside"
              >
                {dataForPie.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderStatistics = () => (
    <>
      <div className="row my-4 justify-content-center">
        {!stats.user.isBot && (
          <div className="col-md-3 col-5 text-center">
            <div className="h1 cb-stats-number">{stats.user.rank}</div>
            <p className="lead">rank</p>
          </div>
        )}
        <div className="col-md-3 col-5 text-center">
          <div className="h1 cb-stats-number">{stats.user.rating}</div>
          <p className="lead">elo_rating</p>
        </div>
        <div className="col-md-3 col-5 text-center">
          <div className="h1 cb-stats-number">
            {Object.values(stats.stats.games).reduce((a, b) => a + b, 0)}
          </div>
          <p className="lead">games_played</p>
        </div>
      </div>
      <div className="row my-4 justify-content-center">
        <div className="col-3 col-lg-2 text-center">
          <div className="h1 cb-stats-number">{stats.stats.games.won}</div>
          <p className="lead">won</p>
        </div>
        <div className="col-3 col-lg-2 text-center border-left border-right">
          <div className="h1 cb-stats-number">{stats.stats.games.lost}</div>
          <p className="lead">lost</p>
        </div>
        <div className="col-3 col-lg-2 text-center">
          <div className="h1 cb-stats-number">{stats.stats.games.gaveUp}</div>
          <p className="lead">gave up</p>
        </div>
      </div>
      <div className="row my-4 justify-content-center">
        <div className="col-10 col-lg-8 cb-heatmap">
          <Heatmap />
        </div>
      </div>
      <div className="row my-4 justify-content-center">
        <CustomPieChart />
      </div>
    </>
  );

  const renderCompletedGames = () => (
    <div className="row justify-content-center">
      <div className="col-12">
        <div className="text-left">
          {completedGames && completedGames.length > 0 && (
            <>
              <CompletedGames
                games={completedGames}
                loadNextPage={loadNextPage}
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
  const statContainers = () => (
    <div>
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
        <div className="col-12 col-md-3 my-4 cb-user-data">
          <div className="mb-4 d-flex justify-content-center">
            <img
              className="img-fluid rounded"
              src={stats.user.avatarUrl}
              alt="User avatar"
            />
          </div>
          <div>
            <h2 className="my-2 text-break cb-heading">{stats.user.name}</h2>
            <h3 className="my-2 cb-heading">
              Lang:
              <img
                src={`/assets/images/achievements/${stats.user.lang}.png`}
                alt={stats.user.lang}
                title={stats.user.lang}
                width="30"
                height="30"
              />
            </h3>
            <hr />
            <p className="small text-monospace text-muted mb-2">
              {'joined at '}
              {dateParse(stats.user.insertedAt)}
            </p>
            <h1 className="my-2">
              {stats.user.githubName && (
                <a
                  title="Github account"
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
                  <h5 className="text-break cb-heading">Achievements</h5>
                  <div className="col d-flex flex-wrap justify-content-start cb-profile mt-3 pl-0">
                    {stats.user.achievements.map(achievement => (
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
        <div className="col-12 col-md-9 my-4 cb-user-stats">
          {statContainers()}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
