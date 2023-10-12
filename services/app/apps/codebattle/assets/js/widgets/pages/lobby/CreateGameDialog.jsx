import React, { useState, useCallback, memo } from 'react';

import axios from 'axios';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import qs from 'qs';
import { useDispatch, useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';

import i18n from '../../../i18n';
import UserLabel from '../../components/UserLabel';
import levelRatio from '../../config/levelRatio';
import * as invitesMiddleware from '../../middlewares/Invite';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as selectors from '../../selectors';
import { actions } from '../../slices';

import TaskChoice from './TaskChoice';

const TIMEOUT = 480;
const gameLevels = Object.keys(levelRatio);
const gameTypeNames = {
  other_user: i18n.t('With other users'),
  invite: i18n.t('With a friend'),
  bot: i18n.t('With a bot'),
};
const gameTypeCodes = Object.keys(gameTypeNames);
const defaultGameOptions = {
  level: gameLevels[0],
  type: gameTypeCodes[0],
  timeoutSeconds: TIMEOUT,
};
const unchosenTask = { id: null };

const OpponentSelect = memo(({ setOpponent, opponent }) => {
  const dispatch = useDispatch();
  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const loadOptions = useCallback((inputValue, callback) => {
    const queryParamsString = qs.stringify({
      q: {
        name_ilike: inputValue,
      },
    });

    axios
      .get(`/api/v1/users?${queryParamsString}`)
      .then(({ data }) => {
        const { users } = camelizeKeys(data);

        const options = users
          .filter(({ id }) => currentUserId !== id)
          .map(user => ({ label: <UserLabel user={user} />, value: user }));

        callback(options);
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, [currentUserId, dispatch]);

  return (
    <AsyncSelect
      className="w-100"
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
  const getLevelClassName = level => {
    const isLevelActive = level === value;
    return cn('btn border-0 mb-2 rounded-lg', {
      'bg-orange': isLevelActive,
      'btn-outline-orange': !isLevelActive,
    });
  };

  const changeGameLevel = level => {
    if (level === value) return;
    onChange(level);
  };

  return (
    <div className="d-flex justify-content-around px-sm-3 px-md-5">
      {gameLevels.map(level => (
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
  const getGameTypeClassName = gameType => {
    const isGameTypeActive = gameType === value;
    return cn('btn mr-1 mb-1 mb-sm-0 rounded-lg text-nowrap', {
      'bg-orange text-white': isGameTypeActive,
      'btn-outline-orange': !isGameTypeActive,
    });
  };

  return (
    <div className="d-flex flex-wrap flex-sm-nowrap justify-content-around px-sm-3 px-md-5 mt-3">
      {gameTypeCodes.map(gameTypeCode => (
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

  const isInvite = gameType === 'invite';
  const isTaskChosen = chosenTask.id !== null;

  const handleTimeoutChange = useCallback(e => setGameTimeout(e.target.value * 60), [setGameTimeout]);

  const switchGameLevel = useCallback(level => {
    setGameLevel(level);
    setChosenTask(unchosenTask);
    setChosenTags([]);
  }, [setGameLevel, setChosenTask, setChosenTags]);

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

  return (
    <div className="mb-2">
      <h5>{i18n.t('Level')}</h5>
      <LevelButtonGroup value={gameLevel} onChange={switchGameLevel} />
      <h5 className="mt-1">{i18n.t('Game Type')}</h5>
      <GameTypeButtonGroup value={gameType} onChange={setGameType} />
      <h5 className="mt-2 mt-sm-3">{i18n.t('Time control')}</h5>
      <div className="px-sm-3 px-md-5 mt-3">
        <input
          type="range"
          className="form-range w-100"
          value={gameTimeout / 60}
          onChange={handleTimeoutChange}
          min="3"
          max="60"
          step="1"
          id="customRange3"
        />
        <span className="d-block text-center text-orange">
          {i18n.t(`${gameTimeout / 60} min`)}
        </span>
      </div>
      {isInvite && (
        <>
          <h5>{i18n.t('Choose opponent')}</h5>
          <div className="px-sm-3 px-md-5 mt-3 mb-3">
            <OpponentSelect setOpponent={setOpponent} opponent={opponent} />
          </div>
        </>
      )}
      <h5 className="mt-2">{i18n.t('Choose task by name or tags')}</h5>
      <TaskChoice
        chosenTask={chosenTask}
        setChosenTask={setChosenTask}
        chosenTags={chosenTags}
        setChosenTags={setChosenTags}
        level={gameLevel}
      />
      <button
        type="button"
        className="btn btn-success d-block mt-4 ml-auto text-white font-weight-bold rounded-lg"
        onClick={createGame}
        disabled={isInvite && !opponent}
      >
        {isInvite ? i18n.t('Create invite') : i18n.t('Create battle')}
      </button>
    </div>
  );
}

export default CreateGameDialog;
