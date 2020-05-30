import React, { useState, useEffect } from 'react';
import i18n from '../../i18n';
import { makeCreateGameUrlDefault } from '../utils/urlBuilders';
import DropdownMenuDefault from './DropdownMenuDefault';

const StartGameCard = ({ title, type }) => {
  const [level, setLevel] = useState('random');
  const [levelClass, setLevelClass] = useState('secondary');
  const [gameUrl, setGameUrl] = useState(makeCreateGameUrlDefault(level, type, 3600));

  useEffect(() => {
    const newGameUrl = makeCreateGameUrlDefault(level, type, 3600);
    setGameUrl(newGameUrl);
  }, [level, type]);

  return (
    <div className="card border-white">
      <h3 className="text-center mb-4">{title}</h3>
      <div className="d-flex align-items-center justify-content-center">
        <button
          type="button"
          data-method="post"
          data-csrf={window.csrf_token}
          data-to={gameUrl}
          className="btn btn-success mb-2"
        >
          {i18n.t('Start battle')}
        </button>
      </div>
      <div className="d-flex align-items-center justify-content-center">
        <span className="mr-3">{i18n.t('Select Difficulty:')}</span>
        <div className="dropdown">
          <button
            id={`btnGroupStartNew${type}Game`}
            type="button"
            className={`btn btn-outline-${levelClass} dropdown-toggle`}
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            {i18n.t(level)}
          </button>
          <div className="dropdown-menu" aria-labelledby={`btnGroupStartNew${type}Game`}>
            <DropdownMenuDefault
              setLevel={setLevel}
              setLevelClass={setLevelClass}
              currentLevel={level}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const LobbyMainPanel = () => (
  <div className="container-xl">
    <div className="row">
      <div className="col-12 col-lg col-md bg-white py-4 mb-3 mr-2">
        <div className="card border-white">
          <p>{i18n.t('Lobby Main Intro')}</p>
        </div>
      </div>
      <div className="col-12 col-lg col-md bg-white py-4 mb-3 mr-2">
        <StartGameCard
          title={i18n.t('Game With Players Title')}
          type="withRandomPlayer"
        />
      </div>
      <div className="col-12 col-lg col-md bg-white py-4 mb-3">
        <StartGameCard
          title={i18n.t('Game With Bots Title')}
          type="bot"
        />
      </div>
    </div>
  </div>
);

export default LobbyMainPanel;
