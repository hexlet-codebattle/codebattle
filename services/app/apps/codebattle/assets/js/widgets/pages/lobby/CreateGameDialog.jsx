import React, { useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import get from 'lodash/get';
import qs from 'qs';
import { useDispatch, useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';

import i18n from '../../../i18n';
import levelRatio from '../../config/levelRatio';
import * as invitesMiddleware from '../../middlewares/Invite';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as selectors from '../../selectors';
import { actions } from '../../slices';

import TaskChoice from './TaskChoice';

const TIMEOUT = 480;

function UserLabel({ user }) {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const isOnline = presenceList.some(({ id }) => id === user.id);
  const onlineIndicatorClassName = cn('mr-1', {
    'cb-user-online': isOnline,
    'cb-user-offline': !isOnline,
  });

  return (
    <span className="text-truncate">
      <FontAwesomeIcon className={onlineIndicatorClassName} icon={['fa', 'circle']} />
      <span>{user.name}</span>
    </span>
  );
}

function OpponentSelect({ opponent, setOpponent }) {
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const dispatch = useDispatch();

  const loadOptions = (inputValue, callback) => {
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
          .map((user) => ({ label: <UserLabel user={user} />, value: user }));

        callback(options);
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  };

  return (
    <AsyncSelect
      defaultOptions
      className="w-100"
      loadOptions={loadOptions}
      value={
        opponent && {
          label: <UserLabel user={opponent} />,
          value: opponent,
        }
      }
      onChange={({ value }) => setOpponent(value)}
    />
  );
}

function CreateGameDialog({ hideModal }) {
  const dispatch = useDispatch();

  const { gameOptions, opponentInfo } = useSelector(selectors.modalSelector);
  const gameLevels = Object.keys(levelRatio);
  const currentGameTypeCodes = ['other_user', 'invite', 'bot'];
  const gameTypeName = {
    other_user: i18n.t('With other users'),
    invite: i18n.t('With a friend'),
    bot: i18n.t('With a bot'),
  };

  const [opponent, setOpponent] = useState(opponentInfo);

  const randomTask = { name: i18n.t('random task'), value: {} };
  const [chosenTask, setChosenTask] = useState(randomTask);
  const [chosenTags, setChosenTags] = useState([]);

  const [game, setGame] = useState({
    level: gameLevels[0],
    type: 'other_user',
    timeoutSeconds: TIMEOUT,
    ...gameOptions,
  });

  const isInvite = game.type === 'invite';

  const createBtnTitle = isInvite ? i18n.t('Create invite') : i18n.t('Create battle');

  const createGame = () => {
    if (isInvite && opponent) {
      dispatch(
        invitesMiddleware.createInvite({
          level: game.level,
          timeout_seconds: game.timeoutSeconds,
          recipient_id: opponent.id,
          recipient_name: opponent.name,
          task_id: get(chosenTask, 'id', null),
          task_tags: chosenTags,
        }),
      );
    } else if (!isInvite) {
      lobbyMiddlewares.createGame({
        level: game.level,
        opponent_type: game.type,
        timeout_seconds: game.timeoutSeconds,
        task_id: get(chosenTask, 'id', null),
        task_tags: chosenTags,
      });
    }
    hideModal();
  };

  const renderPickGameType = () =>
    currentGameTypeCodes.map((gameType) => (
      <button
        key={gameType}
        type="button"
        className={cn('btn rounded-lg', {
          'bg-orange text-white': game.type === gameType,
          'btn-outline-orange': game.type !== gameType,
        })}
        onClick={() => setGame({ ...game, type: gameType })}
      >
        {gameTypeName[gameType]}
      </button>
    ));

  return (
    <div>
      <h5>{i18n.t('Level')}</h5>
      <div className="d-flex justify-content-around px-5 mt-3">
        {gameLevels.map((level) => (
          <button
            key={level}
            data-placement="right"
            data-toggle="tooltip"
            title={level}
            type="button"
            className={cn('btn border-0 mb-2 rounded-lg', {
              'bg-orange': game.level === level,
              'btn-outline-orange': game.level !== level,
            })}
            onClick={() => setGame({ ...game, level })}
          >
            <img alt={level} src={`/assets/images/levels/${level}.svg`} />
          </button>
        ))}
      </div>

      <h5>{i18n.t('Game Type')}</h5>
      <div className="d-flex justify-content-around px-5 mt-3 mb-2">{renderPickGameType()}</div>
      <h5>{i18n.t('Time control')}</h5>
      <div className="d-flex flex-column px-5 mt-3 mb-2">
        <input
          className="form-range w-100"
          id="customRange3"
          max="60"
          min="3"
          step="1"
          type="range"
          value={game.timeoutSeconds / 60}
          onChange={(e) => setGame({ ...game, timeoutSeconds: e.target.value * 60 })}
        />
        <span className="text-center text-orange">{i18n.t(`${game.timeoutSeconds / 60} min`)}</span>
      </div>
      {isInvite && (
        <>
          <h5>{i18n.t('Choose opponent')}</h5>
          <div className="d-flex justify-content-around px-5 mt-3 mb-2">
            <OpponentSelect opponent={opponent} setOpponent={setOpponent} />
          </div>
        </>
      )}
      <TaskChoice
        chosenTags={chosenTags}
        chosenTask={chosenTask}
        level={game.level}
        randomTask={randomTask}
        setChosenTags={setChosenTags}
        setChosenTask={setChosenTask}
      />
      <button
        className="btn btn-success mb-2 mt-4 d-flex ml-auto text-white font-weight-bold rounded-lg"
        disabled={isInvite && !opponent}
        type="button"
        onClick={createGame}
      >
        {createBtnTitle}
      </button>
    </div>
  );
}

export default CreateGameDialog;
