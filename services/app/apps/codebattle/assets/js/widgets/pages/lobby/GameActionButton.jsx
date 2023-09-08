import React from 'react';

import copy from 'copy-to-clipboard';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';

import i18n from '../../../i18n';
import gameStateCodes from '../../config/gameStateCodes';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import { getSignInGithubUrl, makeGameUrl } from '../../utils/urlBuilders';

import ShowButton from './ShowButton';

const havePlayer = (userId, game) => !isEmpty(find(game.players, { id: userId }));

function ContinueButton({ type = 'table', url }) {
  return (
    <a
      className={`btn btn-success ${type === 'table' ? '' : 'w-100'} text-white btn-sm rounded-lg`}
      href={url}
      type="button"
    >
      Continue
    </a>
  );
}

function GameActionButton({ currentUserId, game, isGuest, isOnline, type = 'table' }) {
  const gameUrl = makeGameUrl(game.id);
  const gameUrlJoin = makeGameUrl(game.id, 'join');
  const gameState = game.state;
  const signInUrl = getSignInGithubUrl();

  if (gameState === gameStateCodes.playing) {
    return havePlayer(currentUserId, game) ? (
      <ContinueButton url={gameUrl} />
    ) : (
      <ShowButton type={type} url={gameUrl} />
    );
  }

  if (gameState === gameStateCodes.waitingOpponent) {
    const playing = havePlayer(currentUserId, game);

    if (playing && type === 'table') {
      return (
        <div className="d-flex justify-content-center">
          <div className="btn-group ml-5">
            <ContinueButton url={gameUrl} />
            <button
              className="btn btn-sm btn-outline-secondary border-0"
              data-placement="right"
              data-toggle="tooltip"
              title="Copy link"
              type="button"
              onClick={() => copy(`${window.location.host}${gameUrl}`)}
            >
              <i className="far fa-copy" />
            </button>
            <button
              className="btn btn-sm btn-hover border-0"
              data-placement="right"
              data-toggle="tooltip"
              disabled={!isOnline}
              title="Cancel game"
              type="button"
              onClick={lobbyMiddlewares.cancelGame(game.id)}
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
          <ContinueButton type={type} url={gameUrl} />
          <button
            className="btn btn-sm btn-outline-secondary border-0"
            data-placement="right"
            data-toggle="tooltip"
            title="Copy link"
            type="button"
            onClick={() => copy(`${window.location.host}${gameUrl}`)}
          >
            <i className="far fa-copy" />
          </button>
          <button
            className="btn btn-sm btn-hover border-0"
            data-placement="right"
            data-toggle="tooltip"
            disabled={!isOnline}
            title="Cancel game"
            type="button"
            onClick={lobbyMiddlewares.cancelGame(game.id)}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      );
    }

    if (isGuest) {
      return (
        <button
          className={`btn ${type === 'table' ? 'w-100' : ''} btn-outline-success btn-sm rounded-lg`}
          data-method="get"
          data-to={signInUrl}
          type="button"
        >
          {i18n.t('Sign in with %{name}', { name: 'Github' })}
        </button>
      );
    }

    return (
      <button
        className={`btn btn-orange btn-sm ${type === 'table' ? 'ml-1 px-4' : ''} rounded-lg`}
        data-csrf={window.csrf_token}
        data-method="post"
        data-to={gameUrlJoin}
        type="button"
      >
        {i18n.t('Fight')}
      </button>
    );
  }

  return null;
}

export default GameActionButton;
