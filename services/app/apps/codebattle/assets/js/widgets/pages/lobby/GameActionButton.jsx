import React from 'react';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import copy from 'copy-to-clipboard';
import { getSignInGithubUrl, makeGameUrl } from '../../utils/urlBuilders';
import i18n from '../../../i18n';
import gameStateCodes from '../../config/gameStateCodes';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import ShowButton from './ShowButton';

const havePlayer = (userId, game) => !isEmpty(find(game.players, { id: userId }));

const ContinueButton = ({ url, type = 'table' }) => (
  <a type="button" className={`btn btn-success ${type === 'table' ? '' : 'w-100'} text-white btn-sm rounded-lg`} href={url}>
    Continue
  </a>
);

function GameActionButton({
  type = 'table', game, currentUserId, isGuest, isOnline,
}) {
  const gameUrl = makeGameUrl(game.id);
  const gameUrlJoin = makeGameUrl(game.id, 'join');
  const gameState = game.state;
  const signInUrl = getSignInGithubUrl();

  if (gameState === gameStateCodes.playing) {
    return havePlayer(currentUserId, game)
      ? <ContinueButton url={gameUrl} />
      : <ShowButton url={gameUrl} type={type} />;
  }

  if (gameState === gameStateCodes.waitingOpponent) {
    const playing = havePlayer(currentUserId, game);

    if (playing && type === 'table') {
      return (
        <div className="d-flex justify-content-center">
          <div className="btn-group ml-5">
            <ContinueButton url={gameUrl} />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary border-0"
              onClick={() => copy(`${window.location.host}${gameUrl}`)}
              data-toggle="tooltip"
              data-placement="right"
              title="Copy link"
            >
              <i className="far fa-copy" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-hover border-0"
              onClick={lobbyMiddlewares.cancelGame(game.id)}
              data-toggle="tooltip"
              data-placement="right"
              title="Cancel game"
              disabled={!isOnline}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      );
    }

    if (playing) {
      return (
        <div className="btn-group">
          <ContinueButton url={gameUrl} type={type} />
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary border-0"
            onClick={() => copy(`${window.location.host}${gameUrl}`)}
            data-toggle="tooltip"
            data-placement="right"
            title="Copy link"
          >
            <i className="far fa-copy" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-hover border-0"
            onClick={lobbyMiddlewares.cancelGame(game.id)}
            data-toggle="tooltip"
            data-placement="right"
            title="Cancel game"
            disabled={!isOnline}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      );
    }

    if (isGuest) {
      return (
        <button
          type="button"
          className={`btn ${type === 'table' ? 'w-100' : ''} btn-outline-success btn-sm rounded-lg`}
          data-method="get"
          data-to={signInUrl}
        >
          {i18n.t('Sign in with %{name}', { name: 'Github' })}
        </button>
      );
    }

    return (
      <button
        type="button"
        className={`btn btn-orange btn-sm ${type === 'table' ? 'ml-1 px-4' : ''} rounded-lg`}
        data-method="post"
        data-csrf={window.csrf_token}
        data-to={gameUrlJoin}
      >
        {i18n.t('Fight')}
      </button>
    );
  }

  return null;
}

export default GameActionButton;
