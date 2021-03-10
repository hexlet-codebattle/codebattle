import React, { useState } from 'react';
import { camelizeKeys } from 'humps';
import qs from 'qs';
import { useDispatch, useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';
import classnames from 'classnames';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as mainMiddlewares from '../../middlewares/Main';
import i18n from '../../../i18n';
import levelRatio from '../../config/levelRatio';
import gameTypeCodes from '../../config/gameTypeCodes';
import axios from 'axios';

const TIMEOUTS = [3600, 1800, 900, 600, 60];

const UserLabel = ({ user }) => (
  <span className="text-truncate">
    {`${user.name} (${user.rating})`}
  </span>
);

const hasOption = (options, option) => options.some(({ value }) => value.id === option.value.id);

const OpponentSelect = ({ setOpponent }) => {
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
          .map(
            user => ({ label: <UserLabel user={user} />, value: user })
          );

        callback(options);
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  };

  return (
    <>
      <div className="d-flex justify-content-around px-5 mt-3">
        <AsyncSelect
          className="w-100"
          defaultOptions
          onChange={({ value }) => setOpponent(value)}
          loadOptions={loadOptions}
        />
      </div>
    </>
  );
};

const CreateGameDialog = ({ hideModal }) => {
  const gameLevels = Object.keys(levelRatio);
  const currentGameTypeCodes = [gameTypeCodes.bot, gameTypeCodes.public, gameTypeCodes.private];
  const defaultValue = {
    label: <div>No opponent</div>,
    value: null,
  };

  const [opponent, setOpponent] = useState(defaultValue);

  const [game, setGame] = useState({
    level: gameLevels[0],
    type: gameTypeCodes.public,
    timeoutSeconds: TIMEOUTS[3],
  });

  const isPrivateGame = game.type === gameTypeCodes.private;

  const createBtnTitle = isPrivateGame
    ? i18n.t('Create Invite')
    : i18n.t('Create Battle');

  const create = () => {
    if (isPrivateGame) {
      console.log(opponent);
      mainMiddlewares.createInvite({
        level: game.level,
        type: game.type,
        timeout_seconds: game.timeoutSeconds,
        recepient_id: opponent.id,
      })
    } else {
      lobbyMiddlewares.createGame({
        level: game.level,
        type: game.type,
        timeout_seconds: game.timeoutSeconds,
      });
    }
    hideModal();
  };

  const renderPickTimeouts = () => TIMEOUTS.map(timeout => (
    <button
      key={timeout}
      type="button"
      className={classnames('btn mr-1', {
        'bg-orange text-white': game.timeoutSeconds === timeout,
        'btn-outline-orange': game.timeoutSeconds !== timeout,
      })}
      onClick={() => setGame({ ...game, timeoutSeconds: timeout })}
    >
      {i18n.t(`Timeout ${timeout} seconds`)}
    </button>
  ));

  const renderPickGameType = () => currentGameTypeCodes.map(gameType => (
    <button
      type="button"
      key={gameType}
      className={classnames('btn', {
        'bg-orange text-white': game.type === gameType,
        'btn-outline-orange': game.type !== gameType,
      })}
      onClick={() => setGame({ ...game, type: gameType })}
    >
      {i18n.t(`${gameType} game`)}
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
            className={classnames('btn mb-2', {
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
      <div className="d-flex justify-content-around px-5 mt-3 mb-2">
        {renderPickTimeouts()}
      </div>
      {
        isPrivateGame && <OpponentSelect setOpponent={setOpponent} />
      }

      <button
        type="button"
        className="btn btn-success mb-2 mt-4 d-flex ml-auto text-white font-weight-bold"
        onClick={create}
      >
        {createBtnTitle}
      </button>
    </div>
  );
};

export default CreateGameDialog;
