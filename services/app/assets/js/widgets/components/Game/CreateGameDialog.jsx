import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AsyncSelect from 'react-select/async';
import axios from 'axios';
import qs from 'qs';
import { camelizeKeys } from 'humps';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as mainMiddlewares from '../../middlewares/Main';
import i18n from '../../../i18n';
import levelRatio from '../../config/levelRatio';
import gameTypeCodes from '../../config/gameTypeCodes';

const TIMEOUTS = [3600, 1800, 1200, 900, 600, 300, 120, 60];

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
        <FontAwesomeIcon icon={['fa', 'circle']} className={onlineIndicatorClassName} />
        <span>{`${user.name} (${user.rating})`}</span>
      </span>
    </>
  );
};

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

        const options = users.filter(({ id }) => currentUserId !== id).map(user => ({ label: <UserLabel user={user} />, value: user }));

        callback(options);
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  };

  return <AsyncSelect className="w-100" defaultOptions onChange={({ value }) => setOpponent(value)} loadOptions={loadOptions} />;
};

const CreateGameDialog = ({ hideModal }) => {
  const dispatch = useDispatch();
  const gameLevels = Object.keys(levelRatio);
  const currentGameTypeCodes = ['standard', 'invite', 'bot'];
  const gameTypeName = {
    standard: i18n.t('With other users'),
    invite: i18n.t('With a friend'),
    bot: i18n.t('With a bot'),
  };
  const [opponent, setOpponent] = useState();

  const [game, setGame] = useState({
    level: gameLevels[0],
    type: gameTypeCodes.public,
    timeoutSeconds: TIMEOUTS[3],
  });

  const isInvite = game.type === 'invite';

  const createBtnClassname = cn('btn btn-success mb-2 mt-4 d-flex ml-auto text-white font-weight-bold', {
    disabled: isInvite && !opponent,
  });
  const createBtnTitle = isInvite ? i18n.t('Create Invite') : i18n.t('Create Battle');

  const create = () => {
    if (isInvite && opponent) {
      dispatch(
        mainMiddlewares.createInvite({
          level: game.level,
          timeout_seconds: game.timeoutSeconds,
          recepient_id: opponent.id,
        }),
      );
    } else if (!isInvite) {
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
      className={cn('btn mr-1', {
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
      <div className="d-flex justify-content-around px-5 mt-3 mb-2">{renderPickGameType()}</div>
      <h5>{i18n.t('Time control')}</h5>
      <div className="d-flex justify-content-around px-5 mt-3 mb-2">{renderPickTimeouts()}</div>
      {isInvite && (
        <>
          <h5>{i18n.t('Choose opponent')}</h5>
          <div className="d-flex justify-content-around px-5 mt-3 mb-2">
            <OpponentSelect setOpponent={setOpponent} />
          </div>
        </>
      )}
      <button type="button" className={createBtnClassname} onClick={create}>
        {createBtnTitle}
      </button>
    </div>
  );
};

export default CreateGameDialog;
