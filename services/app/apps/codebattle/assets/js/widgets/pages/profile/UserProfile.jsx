import React, { useState, useEffect } from 'react';

import axios from 'axios';
import { camelizeKeys } from 'humps';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import { useDispatch, useSelector } from 'react-redux';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

import Loading from '../../components/Loading';
import langIconNames from '../../config/langIconNames';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import { fetchCompletedGames, loadNextPage } from '../../slices/completedGames';
import CompletedGames from '../lobby/CompletedGames';

import Heatmap from './Heatmap';

function UserProfile() {
  const [stats, setStats] = useState(null);
  const { completedGames, totalGames } = useSelector(selectors.completedGamesData);

  const dispatch = useDispatch();

  useEffect(() => {
    const userId = window.location.pathname.split('/').pop();

    axios
      .get(`/api/v1/user/${userId}/stats`)
      .then((response) => {
        setStats(camelizeKeys(response.data));
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCompletedGames());
  }, [dispatch]);

  const dateParse = (date) =>
    new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const renderAchivement = (achievement) => {
    if (achievement.includes('win_games_with')) {
      const langs = achievement.split('?').pop().split('_');

      return (
        <div className="cb-polyglot mr-1 mb-1" title={achievement}>
          <div className="d-flex h-75 flex-wrap align-items-center justify-content-around cb-polyglot-icons">
            {langs.map((lang) => (
              <img
                key={lang}
                alt={lang}
                height="14"
                src={`/assets/images/achievements/${lang}.png`}
                title={lang}
                width="14"
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <img
        alt={achievement}
        className="mr-1 mb-1"
        height="65"
        src={`/assets/images/achievements/${achievement}.png`}
        title={achievement}
        width="65"
      />
    );
  };

  if (!stats) {
    return <Loading />;
  }

  const renderCustomPieChart = () => {
    if (!stats.stats) {
      return <Loading />;
    }

    const colors = [
      '#8884d8',
      '#0000FF',
      '#008000',
      '#FF0000',
      '#800080',
      '#FFA500',
      '#FFC0CB',
      '#A52A2A',
      '#808080',
      '#ADD8E6',
      '#90EE90',
      '#FFB6C1',
      '#E6E6FA',
      '#FFA07A',
    ];

    const groups = groupBy(stats.stats.all, 'lang');
    const reducedByLangStats = mapValues(groups, (group) =>
      group.reduce((total, item) => total + item.count, 0),
    );
    const resultDataForPie = Object.entries(reducedByLangStats).map(([lang, count]) => ({
      name: lang,
      value: count,
    }));
    const fullMark = Math.max(...Object.values(stats.stats.games));
    const resultDataForRadar = Object.keys(stats.stats.games).map((subject) => ({
      subject,
      A: stats.stats.games[subject],
      fullMark,
    }));

    const sortedDataForPie = resultDataForPie.sort(({ value: a }, { value: b }) => {
      if (a < b) return 1;
      if (a > b) return -1;
      return 0;
    });
    const sortedDataForRadar = resultDataForRadar.sort((a, b) => {
      if (a.subject === 'won') return -1;
      if (b.subject === 'won') return 1;
      if (a.subject < b.subject) return -1;
      if (a.subject > b.subject) return 1;
      return 0;
    });

    return (
      <>
        <div className="col-6">
          <ResponsiveContainer height="100%" width="100%">
            <RadarChart cx="50%" cy="50%" data={sortedDataForRadar} outerRadius="80%">
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis />
              <Radar dataKey="A" fill="#8884d8" fillOpacity={0.6} name="count" stroke="#8884d8" />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="col-6">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                label
                data={sortedDataForPie}
                dataKey="value"
                labelLine={false}
                position="inside"
              >
                {sortedDataForPie.map(({ name }, index) => (
                  <Cell key={`cell-${name}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </>
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
      <div className="row my-4 justify-content-center" style={{ width: '100%', height: 400 }}>
        {renderCustomPieChart()}
      </div>
      <div className="row my-4 justify-content-center">
        <div className="col-10 col-lg-8 cb-heatmap">
          <Heatmap />
        </div>
      </div>
    </>
  );

  const renderCompletedGames = () => (
    <div className="row justify-content-center">
      <div className="col-12">
        <div className="text-left">
          {completedGames && completedGames.length > 0 && (
            <CompletedGames
              className="table-responsive scroll h-75"
              games={completedGames}
              loadNextPage={loadNextPage}
              totalGames={totalGames}
            />
          )}
          {completedGames && completedGames.length === 0 && (
            <div
              className="d-flex align-items-center justify-content-center border text-muted"
              style={{ height: 498 }}
            >
              No completed games
            </div>
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
            aria-controls="statistics"
            aria-selected="true"
            className="nav-item nav-link active text-uppercase rounded-0 text-black font-weight-bold p-3"
            data-toggle="tab"
            href="#statistics"
            id="statistics-tab"
            role="tab"
          >
            Statistics
          </a>
          <a
            aria-controls="completedGames"
            aria-selected="false"
            className="nav-item nav-link text-uppercase rounded-0 text-black font-weight-bold p-3"
            data-toggle="tab"
            href="#completedGames"
            id="completedGames-tab"
            role="tab"
          >
            Completed games
          </a>
        </div>
      </nav>
      <div className="tab-content" id="nav-tabContent">
        <div
          aria-labelledby="statistics-tab"
          className="tab-pane fade border show active"
          id="statistics"
          role="tabpanel"
        >
          {renderStatistics()}
        </div>
        <div
          aria-labelledby="completedGames-tab"
          className="tab-pane fade"
          id="completedGames"
          role="tabpanel"
        >
          {renderCompletedGames()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-lg">
      <div className="row">
        <div className="col-12 col-md-3 my-4 cb-user-data d-flex flex-column">
          <div className="mb-2 mb-sm-4 d-flex justify-content-center">
            <img
              alt="User avatar"
              className="cb-profile-avatar rounded"
              src={stats.user.avatarUrl}
            />
          </div>
          <div className="text-center">
            <h2 className="my-2 text-break cb-heading font-weight-bold">{stats.user.name}</h2>
            <hr />
            <h3 className="my-2 cb-heading">
              <span className="d-none d-sm-block">Lang:</span>
              <img
                alt={stats.user.lang}
                height="30"
                src={`/assets/images/achievements/${langIconNames[stats.user.lang]}.png`}
                title={stats.user.lang}
                width="30"
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
                  className="text-muted"
                  href={`https://github.com/${stats.user.githubName}`}
                  title="Github account"
                >
                  <span className="fab fa-github" />
                </a>
              )}
            </h1>
            <div className="my-2">
              {stats.user.achievements.length > 0 && (
                <>
                  <hr className="mt-2" />
                  <h5 className="text-break cb-heading">Achievements</h5>
                  <div className="col d-flex flex-wrap justify-content-start cb-profile mt-3 pl-0">
                    {stats.user.achievements.map((achievement) => (
                      <div key={achievement}>{renderAchivement(achievement)}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-9 my-4 cb-user-stats">{statContainers()}</div>
      </div>
    </div>
  );
}

export default UserProfile;
