import React, { useState } from 'react';
import classnames from 'classnames';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import i18n from '../../../i18n';
import levelRatio from '../../config/levelRatio';
import gameTypeCodes from '../../config/gameTypeCodes';

const TIMEOUTS = [3600, 1800, 1200, 900, 600, 300, 120, 60];

const CreateGameDialog = ({ hideModal }) => {
  const gameLevels = Object.keys(levelRatio);
  const currentGameTypeCodes = [gameTypeCodes.bot, gameTypeCodes.public, gameTypeCodes.private];

  const [game, setGame] = useState({
    level: gameLevels[0],
    type: gameTypeCodes.public,
    timeoutSeconds: TIMEOUTS[3],
  });

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

  const renderPickPlayer = () => currentGameTypeCodes.map(gameType => (
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

      <h5>{i18n.t('Players')}</h5>
      <div className="d-flex justify-content-around px-5 mt-3 mb-2">
        {renderPickPlayer()}
      </div>
      <h5>{i18n.t('Time control')}</h5>
      <div className="d-flex justify-content-around px-5 mt-3">
        {renderPickTimeouts()}
      </div>

      <button
        type="button"
        className="btn btn-success mb-2 mt-4 d-flex ml-auto text-white font-weight-bold"
        onClick={() => {
          lobbyMiddlewares.createGame({
            level: game.level,
            type: game.type,
            timeout_seconds: game.timeoutSeconds,
          });
          hideModal();
        }}
      >
        {i18n.t('Start battle')}
      </button>
    </div>
  );
};

export default CreateGameDialog;
