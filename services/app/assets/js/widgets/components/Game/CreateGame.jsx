import React, { useState } from 'react';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import i18n from '../../../i18n';

const CreateGame = ({ hideModal }) => {
  const [game, setGame] = useState({ level: 'elementary', type: 'withRandomPlayer' });

  const gameLevels = ['elementary', 'easy', 'medium', 'hard'];

  return (
    <div>
      <h5>Level</h5>
      <div className="d-flex justify-content-around px-5 mt-3">
        {gameLevels.map(level => (
          <button
            key={level}
            type="button"
            className={`btn ${game.level === level ? 'bg-orange' : 'btn-outline-orange border-0'}`}
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
          className={`btn ${game.type === 'bot' ? 'bg-orange text-white' : 'btn-outline-orange'}`}
          onClick={() => setGame({ ...game, type: 'bot' })}
        >
          With bot
        </button>
        <button
          type="button"
          className={`btn ${game.type === 'withRandomPlayer' ? 'bg-orange text-white' : 'btn-outline-orange'}`}
          onClick={() => setGame({ ...game, type: 'withRandomPlayer' })}
        >
          With random player
        </button>
      </div>

      <button
        type="button"
        className="btn btn-success mb-2 mt-4 d-flex ml-auto text-white font-weight-bold"
        onClick={() => {
          lobbyMiddlewares.createGame({ level: game.level, type: game.type });
          hideModal();
        }}
      >
        {i18n.t('Start battle')}
      </button>
    </div>
  );
};

export default CreateGame;
