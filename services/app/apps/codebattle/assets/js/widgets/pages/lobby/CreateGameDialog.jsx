import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AsyncSelect from 'react-select/async';
import axios from 'axios';
import qs from 'qs';
import { camelizeKeys } from 'humps';
import _ from 'lodash';

import * as selectors from '../../selectors';
import { actions } from '../../slices';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as invitesMiddleware from '../../middlewares/Invite';
import i18n from '../../../i18n';
import levelRatio from '../../config/levelRatio';
import TaskChoice from './TaskChoice';

const TIMEOUT = 480;

const UserLabel = ({ user }) => {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const isOnline = presenceList.some(({ id }) => id === user.id);
  const onlineIndicatorClassName = cn('mr-1', {
    'cb-user-online': isOnline,
    'cb-user-offline': !isOnline,
  });

  return (
    <>
      <span className="text-truncate">
        <FontAwesomeIcon
          icon={['fa', 'circle']}
          className={onlineIndicatorClassName}
        />
        <span>{user.name}</span>
      </span>
    </>
  );
};

const OpponentSelect = ({ setOpponent, opponent }) => {
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
          .map(user => ({ label: <UserLabel user={user} />, value: user }));

        callback(options);
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  };

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
};

const CreateGameDialog = ({ hideModal }) => {
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

  const createBtnTitle = isInvite
    ? i18n.t('Create Invite')
    : i18n.t('Create Battle');

  const createGame = () => {
    if (isInvite && opponent) {
      dispatch(
        invitesMiddleware.createInvite({
          level: game.level,
          timeout_seconds: game.timeoutSeconds,
          recipient_id: opponent.id,
          recipient_name: opponent.name,
          task_id: _.get(chosenTask, 'id', null),
          task_tags: chosenTags,
        }),
      );
    } else if (!isInvite) {
      lobbyMiddlewares.createGame({
        level: game.level,
        opponent_type: game.type,
        timeout_seconds: game.timeoutSeconds,
        task_id: _.get(chosenTask, 'id', null),
        task_tags: chosenTags,
      });
    }
    hideModal();
  };

  const renderPickGameType = () => currentGameTypeCodes.map(gameType => (
    <button
      type="button"
      key={gameType}
      className={cn('btn', {
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
        {gameLevels.map(level => (
          <button
            key={level}
            type="button"
            className={cn('btn mb-2', {
              'bg-orange': game.level === level,
              'btn-outline-orange border-0': game.level !== level,
            })}
            onClick={() => setGame({ ...game, level })}
            data-toggle="tooltip"
            data-placement="right"
            title={level}
          >
            <img alt={level} src={`/assets/images/levels/${level}.svg`} />
          </button>
        ))}
      </div>

      <h5>{i18n.t('Game Type')}</h5>
      <div className="d-flex justify-content-around px-5 mt-3 mb-2">
        {renderPickGameType()}
      </div>
      <h5>{i18n.t('Time control')}</h5>
      <div className="d-flex flex-column px-5 mt-3 mb-2">
        <input
          type="range"
          className="form-range w-100"
          value={game.timeoutSeconds / 60}
          onChange={e => setGame({ ...game, timeoutSeconds: e.target.value * 60 })}
          min="3"
          max="60"
          step="1"
          id="customRange3"
        />
        <span className="text-center text-orange">
          {i18n.t(`${game.timeoutSeconds / 60} min`)}
        </span>
      </div>
      {isInvite && (
        <>
          <h5>{i18n.t('Choose opponent')}</h5>
          <div className="d-flex justify-content-around px-5 mt-3 mb-2">
            <OpponentSelect setOpponent={setOpponent} opponent={opponent} />
          </div>
        </>
      )}
      <TaskChoice
        chosenTask={chosenTask}
        setChosenTask={setChosenTask}
        chosenTags={chosenTags}
        setChosenTags={setChosenTags}
        level={game.level}
        randomTask={randomTask}
      />
      <button
        type="button"
        className="btn btn-success mb-2 mt-4 d-flex ml-auto text-white font-weight-bold"
        onClick={createGame}
        disabled={isInvite && !opponent}
      >
        {createBtnTitle}
      </button>
    </div>
  );
};

export default CreateGameDialog;
