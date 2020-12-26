import React, { useState } from 'react';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
// TODO_LERA: add cn
import i18n from '../../../i18n';

const CreateGameDialog = ({ hideModal }) => {
  const [game, setGame] = useState({
    level: 'elementary',
    type: 'withRandomPlayer',
    timeoutSeconds: 600,
  });

  const gameLevels = ['elementary', 'easy', 'medium', 'hard'];

  return (
    <div>
      <h5>Level</h5>
      <div className="d-flex justify-content-around px-5 mt-3">
        {gameLevels.map(level => (
          <button
            key={level}
            type="button"
            className={`btn ${
              game.level === level ? 'bg-orange' : 'btn-outline-orange border-0'
            }`}
            onClick={() => setGame({ ...game, level })}
            data-toggle="tooltip"
            data-placement="right"
            title={level}
          >
            <img alt={level} src={`/assets/images/levels/${level}.svg`} />
          </button>
        ))}
      </div>

      <h5>Players</h5>
      <div className="d-flex justify-content-around px-5 mt-3">
        <button
          type="button"
          className={`btn ${
            game.type === 'bot' ? 'bg-orange text-white' : 'btn-outline-orange'
          }`}
          onClick={() => setGame({ ...game, type: 'bot' })}
        >
          With bot
        </button>
        <button
          type="button"
          className={`btn ${
            game.type === 'withRandomPlayer'
              ? 'bg-orange text-white'
              : 'btn-outline-orange'
          }`}
          onClick={() => setGame({ ...game, type: 'withRandomPlayer' })}
        >
          With human
        </button>
        <button
          type="button"
          className={`btn ${
            game.type === 'withFriend'
              ? 'bg-orange text-white'
              : 'btn-outline-orange'
          }`}
          onClick={() => setGame({ ...game, type: 'withFriend' })}
        >
          With friend
        </button>
      </div>
      <h5>Time control </h5>
      <div className="d-flex justify-content-around px-5 mt-3">
        <button
          type="button"
          className={`btn ${
            game.timeoutSeconds === 3600
              ? 'bg-orange text-white'
              : 'btn-outline-orange'
          }`}
          onClick={() => setGame({ ...game, timeoutSeconds: 3600 })}
        >
          1 hour
        </button>
        <button
          type="button"
          className={`btn ${
            game.timeoutSeconds === 1800
              ? 'bg-orange text-white'
              : 'btn-outline-orange'
          }`}
          onClick={() => setGame({ ...game, timeoutSeconds: 1800 })}
        >
          30 min
        </button>
        <button
          type="button"
          className={`btn ${
            game.timeoutSeconds === 900
              ? 'bg-orange text-white'
              : 'btn-outline-orange'
          }`}
          onClick={() => setGame({ ...game, timeoutSeconds: 900 })}
        >
          15 min
        </button>
        <button
          type="button"
          className={`btn ${
            game.timeoutSeconds === 600
              ? 'bg-orange text-white'
              : 'btn-outline-orange'
          }`}
          onClick={() => setGame({ ...game, timeoutSeconds: 600 })}
        >
          10 min
        </button>
        <button
          type="button"
          className={`btn ${
            game.timeoutSeconds === 60
              ? 'bg-orange text-white'
              : 'btn-outline-orange'
          }`}
          onClick={() => setGame({ ...game, timeoutSeconds: 60 })}
        >
          1 min
        </button>
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
