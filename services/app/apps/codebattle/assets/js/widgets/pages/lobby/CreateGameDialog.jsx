import React, { useState, useCallback, memo } from "react";

import axios from "axios";
import cn from "classnames";
import { camelizeKeys } from "humps";
import qs from "qs";
import { useDispatch, useSelector } from "react-redux";
import AsyncSelect from "react-select/async";

import i18n from "../../../i18n";
import UserLabel from "../../components/UserLabel";
import levelRatio from "../../config/levelRatio";
import * as invitesMiddleware from "../../middlewares/Invite";
import * as lobbyMiddlewares from "../../middlewares/Lobby";
import * as selectors from "../../selectors";
import { actions } from "../../slices";

import TaskChoice from "./TaskChoice";

const TIMEOUT = 480;
const TIMEOUT_MIN = 1;
const TIMEOUT_MAX = 60;
const gameLevels = Object.keys(levelRatio);
const gameTypeNames = {
  other_user: i18n.t("With other user"),
  invite: i18n.t("With a friend"),
  bot: i18n.t("With a bot"),
};
const gameTypeCodes = Object.keys(gameTypeNames);
const defaultGameOptions = {
  level: gameLevels[0],
  type: gameTypeCodes[0],
  timeoutSeconds: TIMEOUT,
};
const unchosenTask = { id: null };
const opponentSelectStyles = {
  menu: (base) => ({
    ...base,
    backgroundColor: "#1c1c24",
  }),
  container: (base) => ({
    ...base,
    backgroundColor: "#1c1c24",
    color: "white",
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: "#dc3545",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#dc3545",
    ":hover": {
      ...base[":hover"],
      color: "#e04d5b",
    },
  }),
  control: (base, state) => ({
    ...base,
    backgroundColor: "#1c1c24",
    borderColor: state.isFocused ? "#e04d5b" : "#dc3545",
    boxShadow: "none",
    ":hover": {
      ...base[":hover"],
      borderColor: "#e04d5b",
      cursor: "pointer",
    },
  }),
  input: (base) => ({
    ...base,
    color: "white",
  }),
  singleValue: (base) => ({
    ...base,
    color: "white",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#2a2a35" : "#1c1c24",
    color: "white",
    ":hover": {
      ...base[":hover"],
      cursor: "pointer",
      backgroundColor: "#2a2a35",
    },
  }),
};

const OpponentSelect = memo(({ setOpponent, opponent }) => {
  const dispatch = useDispatch();
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const { presenceList } = useSelector(selectors.lobbyDataSelector);

  const loadOptions = useCallback(
    (inputValue, callback) => {
      const queryParamsString = qs.stringify({
        q: {
          name_ilike: inputValue,
        },
      });

      axios
        .get(`/api/v1/users?${queryParamsString}`)
        .then(({ data }) => {
          const { users: apiUsers } = camelizeKeys(data);
          const filteredApiUsers = apiUsers.filter(({ id }) => id !== currentUserId);
          const onlineUsersFromPresence = presenceList
            .map((p) => p.user)
            .filter((user) => user.id !== currentUserId);
          const combinedUsersMap = new Map();

          filteredApiUsers.forEach((user) => {
            const isOnline = presenceList.some(
              (presence) => String(presence.id) === String(user.id),
            );
            combinedUsersMap.set(user.id, { ...user, online: isOnline });
          });

          onlineUsersFromPresence.forEach((onlineUser) => {
            if (!combinedUsersMap.has(onlineUser.id)) {
              combinedUsersMap.set(onlineUser.id, {
                ...onlineUser,
                online: true,
              });
            }
          });

          const combinedUsers = Array.from(combinedUsersMap.values());

          const sortedUsers = combinedUsers.sort((a, b) => {
            const aOnline = a.online;
            const bOnline = b.online;
            if (aOnline === bOnline) {
              return 0;
            }
            return aOnline ? -1 : 1;
          });

          const options = sortedUsers.map((user) => ({
            label: <UserLabel user={user} />,
            value: user,
          }));

          callback(options);
        })
        .catch((error) => {
          dispatch(actions.setError(error));
        });
    },
    [currentUserId, dispatch, presenceList],
  );

  return (
    <AsyncSelect
      className="w-100"
      styles={opponentSelectStyles}
      value={
        opponent && {
          label: <UserLabel user={opponent} />,
          value: opponent,
        }
      }
      defaultOptions
      onChange={({ value }) => setOpponent(value)}
      loadOptions={loadOptions}
    />
  );
});

const LevelButtonGroup = memo(({ value, onChange }) => {
  const getLevelClassName = (level) => {
    const isLevelActive = level === value;
    return cn("btn border-0 mb-2 bg-gray cb-rounded", {
      "bg-orange": isLevelActive,
      "btn-outline-orange": !isLevelActive,
    });
  };

  const changeGameLevel = (level) => {
    if (level === value) return;
    onChange(level);
  };

  return (
    <div className="d-flex justify-content-around px-sm-3 px-md-5">
      {gameLevels.map((level) => (
        <button
          key={level}
          type="button"
          className={getLevelClassName(level)}
          onClick={() => changeGameLevel(level)}
          data-toggle="tooltip"
          data-placement="right"
          title={level}
        >
          <img alt={level} src={`/assets/images/levels/${level}.svg`} />
        </button>
      ))}
    </div>
  );
});

const GameTypeButtonGroup = memo(({ value, onChange }) => {
  const getGameTypeClassName = (gameType) => {
    const isGameTypeActive = gameType === value;
    return cn("btn mr-1 mb-1 mb-sm-0 cb-rounded text-nowrap", {
      "bg-orange text-white": isGameTypeActive,
      "btn-outline-orange": !isGameTypeActive,
    });
  };

  return (
    <div className="d-flex flex-wrap flex-sm-nowrap justify-content-around px-sm-3 px-md-5 mt-3">
      {gameTypeCodes.map((gameTypeCode) => (
        <button
          key={gameTypeCode}
          type="button"
          className={getGameTypeClassName(gameTypeCode)}
          onClick={() => onChange(gameTypeCode)}
        >
          {gameTypeNames[gameTypeCode]}
        </button>
      ))}
    </div>
  );
});

function CreateGameDialog({ hideModal }) {
  const dispatch = useDispatch();
  const { gameOptions: givenGameOptions, opponentInfo } = useSelector(selectors.modalSelector);
  const [opponent, setOpponent] = useState(opponentInfo);
  const [chosenTask, setChosenTask] = useState(unchosenTask);
  const [chosenTags, setChosenTags] = useState([]);

  const gameOptions = { ...defaultGameOptions, ...givenGameOptions };
  const [gameLevel, setGameLevel] = useState(gameOptions.level);
  const [gameType, setGameType] = useState(gameOptions.type);
  const [gameTimeout, setGameTimeout] = useState(gameOptions.timeoutSeconds);

  const isInvite = gameType === "invite";
  const isTaskChosen = chosenTask.id !== null;

  const handleTimeoutChange = useCallback(
    (e) => setGameTimeout(Number(e.target.value) * 60),
    [setGameTimeout],
  );

  const switchGameLevel = useCallback(
    (level) => {
      setGameLevel(level);
      setChosenTask(unchosenTask);
      setChosenTags([]);
    },
    [setGameLevel, setChosenTask, setChosenTags],
  );

  const createGame = () => {
    if (isInvite && opponent) {
      dispatch(
        invitesMiddleware.createInvite({
          level: gameLevel,
          timeout_seconds: gameTimeout,
          recipient_id: opponent.id,
          recipient_name: opponent.name,
          task_id: chosenTask.id,
          task_tags: isTaskChosen ? [] : chosenTags,
        }),
      );
    } else if (!isInvite) {
      lobbyMiddlewares.createGame({
        level: gameLevel,
        opponent_type: gameType,
        timeout_seconds: gameTimeout,
        task_id: chosenTask.id,
        task_tags: isTaskChosen ? [] : chosenTags,
      });
    }
    hideModal();
  };

  const timeoutMinutes = gameTimeout / 60;
  const timeoutPercent = Math.min(
    100,
    Math.max(0, ((timeoutMinutes - TIMEOUT_MIN) / (TIMEOUT_MAX - TIMEOUT_MIN)) * 100),
  );

  return (
    <div className="cb-create-game">
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title">
          <h5 className="mb-0">{i18n.t("Level")}</h5>
        </div>
        <LevelButtonGroup value={gameLevel} onChange={switchGameLevel} />
      </div>
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title">
          <h5 className="mb-0">{i18n.t("Game Type")}</h5>
        </div>
        <GameTypeButtonGroup value={gameType} onChange={setGameType} />
      </div>
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title cb-create-game__section-title--with-value">
          <h5 className="mb-0">{i18n.t("Time control")}</h5>
          <span className="cb-create-game__time-value">{i18n.t(`${timeoutMinutes} min`)}</span>
        </div>
        <div className="px-sm-3 px-md-5 mt-3">
          <input
            type="range"
            className="form-range w-100 cb-range"
            value={timeoutMinutes}
            onChange={handleTimeoutChange}
            min={TIMEOUT_MIN}
            max={TIMEOUT_MAX}
            step="1"
            id="customRange3"
            style={{ "--range-progress": `${timeoutPercent}%` }}
          />
        </div>
      </div>
      {isInvite && (
        <div className="cb-create-game__section">
          <div className="cb-create-game__section-title">
            <h5 className="mb-0">{i18n.t("Choose opponent")}</h5>
          </div>
          <div className="px-sm-3 px-md-5 mt-3">
            <OpponentSelect setOpponent={setOpponent} opponent={opponent} />
          </div>
        </div>
      )}
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title">
          <h5 className="mb-0">{i18n.t("Choose task by name or tags")}</h5>
        </div>
        <TaskChoice
          chosenTask={chosenTask}
          setChosenTask={setChosenTask}
          chosenTags={chosenTags}
          setChosenTags={setChosenTags}
          level={gameLevel}
        />
      </div>
      <div className="cb-create-game__footer">
        <button
          type="button"
          className="btn btn-secondary cb-btn-secondary cb-rounded px-4"
          onClick={createGame}
          disabled={isInvite && !opponent}
        >
          {isInvite ? i18n.t("Create invite") : i18n.t("Create battle")}
        </button>
      </div>
    </div>
  );
}

export default CreateGameDialog;
