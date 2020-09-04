import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Pagination from "react-js-pagination";
import moment from "moment";
import UserInfo from "./UserInfo";
import { usersListSelector } from "../selectors";
import { getUsersRatingPage } from "../middlewares/Users";
import Loading from "../components/Loading";
import i18n from "../../i18n";
import axios from "axios";
import { camelizeKeys } from "humps";
import Heatmap from "./Heatmap";

const UserProfile = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const userId = window.location.pathname.split("/").pop();
    axios.get(`/api/v1/user/${userId}/stats`).then((response) => {
      setStats(camelizeKeys(response.data));
    });
  }, [setStats]);

  const renderAchievemnt = (achievement) => {
    if (achievement.includes("win_games_with")) {
      const langs = achievement.split("?").pop().split("_");

      return (
        <div className="cb-polyglot" title="#{achievement}">
          <div className="d-flex h-75 flex-wrap align-items-center justify-content-around">
            {langs.map((lang) => (
              <img
                src={`/assets/images/achievements/${lang}.png`}
                alt={lang}
                title={lang}
                width="38"
                height="38"
              />
            ))}
          </div>
        </div>
      );
    } else {
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
    }
  };
  if (console.log("12321321342@!#$!@#$", stats) || !stats) {
    return <Loading />;
  }
  return (
    <div className="text-center">
      <h2 className="font-weight-normal">User Profile</h2>
      <div className="container bg-white shadow-sm">
        <div className="row">
          <div className="col-12 text-center mt-4">
            <div className="row">
              <div className="col-10 col-sm-4 col-md-2 m-auto">
                <img
                  className="attachment user avatar img-fluid rounded"
                  src={`https://avatars0.githubusercontent.com/u/${stats.user.githubId}`}
                />
              </div>
            </div>
            <h1 className="mt-1 mb-0">
              {stats.user.name}
              <a
                className="text-muted"
                href={`https://github.com/${stats.user.githubName}`}
              >
                <span className="fab fa-github mt-5 pl-3"></span>
              </a>
            </h1>
            <h2 className="mt-1 mb-0">{`Lang ${stats.user.lang}`}</h2>
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
          <div className="col-12 text-center mt-4">
            <h2 className="mt-1 mb-0">Achievements:</h2>

            <div className="d-flex justify-content-center cb-profile">
              {stats.user.achievements.map((achievement) => (
                <div key={achievement}>{renderAchievemnt(achievement)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

      // 1. почистить импорты в этом компоненте
      // 2. Сделать компонент completed_games на базе renderCompletedGames
      // 3. Отрисовать под ачивками последние игры игрока, если они есть
      // Если нет можно оставить пустоту
      // 4. Добавить key в lang.map
