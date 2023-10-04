import React, { useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
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
}

function OpponentSelect({ setOpponent, opponent }) {
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

  const unchosenTask = { id: null };
  const [chosenTask, setChosenTask] = useState(unchosenTask);
  const [chosenTags, setChosenTags] = useState([]);

  const [game, setGame] = useState({
    level: gameLevels[0],
    type: 'other_user',
    timeoutSeconds: TIMEOUT,
    ...gameOptions,
  });

  const isInvite = game.type === 'invite';

  const createBtnTitle = isInvite
    ? i18n.t('Create invite')
    : i18n.t('Create battle');

  const createGame = () => {
    if (isInvite && opponent) {
      dispatch(
        invitesMiddleware.createInvite({
          level: game.level,
          timeout_seconds: game.timeoutSeconds,
          recipient_id: opponent.id,
          recipient_name: opponent.name,
          task_id: chosenTask.id,
          task_tags: chosenTags,
        }),
      );
    } else if (!isInvite) {
      lobbyMiddlewares.createGame({
        level: game.level,
        opponent_type: game.type,
        timeout_seconds: game.timeoutSeconds,
        task_id: chosenTask.id,
        task_tags: chosenTags,
      });
    }
    hideModal();
  };

  const renderPickGameType = () => currentGameTypeCodes.map(gameType => (
    <button
      type="button"
      key={gameType}
      className={cn('btn mr-1 mb-1 mb-sm-0 rounded-lg text-nowrap', {
          'bg-orange text-white': game.type === gameType,
          'btn-outline-orange': game.type !== gameType,
        })}
      onClick={() => setGame({ ...game, type: gameType })}
    >
      {gameTypeName[gameType]}
    </button>
    ));

  return (
    <div className="mb-2">
      <h5>{i18n.t('Level')}</h5>
      <div className="d-flex justify-content-around px-sm-3 px-md-5">
        {gameLevels.map(level => (
          <button
            key={level}
            type="button"
            className={cn('btn border-0 mb-2 rounded-lg', {
              'bg-orange': game.level === level,
              'btn-outline-orange': game.level !== level,
            })}
            onClick={() => {
              if (game.level === level) return;

              setGame({ ...game, level });
              setChosenTask(unchosenTask);
              setChosenTags([]);
            }}
            data-toggle="tooltip"
            data-placement="right"
            title={level}
          >
            <img alt={level} src={`/assets/images/levels/${level}.svg`} />
          </button>
        ))}
      </div>

      <h5 className="mt-1">{i18n.t('Game Type')}</h5>
      <div className="d-flex flex-wrap flex-sm-nowrap justify-content-around px-sm-3 px-md-5 mt-3">
        {renderPickGameType()}
      </div>
      <h5 className="mt-2 mt-sm-3">{i18n.t('Time control')}</h5>
      <div className={cn('px-sm-3 px-md-5 mt-3', { 'mb-2': !isInvite })}>
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
        <span className="d-block text-center text-orange">
          {i18n.t(`${game.timeoutSeconds / 60} min`)}
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
      <TaskChoice
        chosenTask={chosenTask}
        setChosenTask={setChosenTask}
        chosenTags={chosenTags}
        setChosenTags={setChosenTags}
        level={game.level}
      />
      <button
        type="button"
        className="btn btn-success mt-4 d-flex ml-auto text-white font-weight-bold rounded-lg"
        onClick={createGame}
        disabled={isInvite && !opponent}
      >
        {createBtnTitle}
      </button>
    </div>
  );
}

export default CreateGameDialog;
