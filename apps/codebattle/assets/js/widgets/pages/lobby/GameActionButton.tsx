import React from 'react';

import copy from 'copy-to-clipboard';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';

import i18n from '../../../i18n';
import gameStateCodes from '../../config/gameStateCodes';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import { getSignInGithubUrl, makeGameUrl } from '../../utils/urlBuilders';

import ShowButton from './ShowButton';

export interface LobbyGamePlayer {
  id: number;
  [key: string]: unknown;
}

export interface LobbyGame {
  id: number;
  state: string;
  level: string;
  isBot?: boolean;
  visibilityType?: string;
  players: LobbyGamePlayer[];
  [key: string]: unknown;
}

const havePlayer = (userId: number | null, game: LobbyGame) =>
  !isEmpty(find(game.players, { id: userId }));

interface ContinueButtonProps {
  url: string;
  type?: string;
}

function ContinueButton({ url, type = 'table' }: ContinueButtonProps) {
  return (
    <a
      type="button"
      className={`btn btn-success ${type === 'table' ? '' : 'w-100'} text-white btn-sm rounded-lg`}
      href={url}
    >
      {i18n.t('Continue')}
    </a>
  );
}

interface GameActionButtonProps {
  type?: string;
  game: LobbyGame;
  currentUserId: number | null;
  isGuest?: boolean;
  isOnline?: boolean;
}

function GameActionButton({
  type = 'table',
  game,
  currentUserId,
  isGuest,
  isOnline,
}: GameActionButtonProps) {
  const gameUrl = makeGameUrl(game.id);
  const gameUrlJoin = makeGameUrl(game.id, 'join');
  const gameState = game.state;
  const signInUrl = getSignInGithubUrl();

  if (gameState === gameStateCodes.playing) {
    return havePlayer(currentUserId, game) ? (
      <ContinueButton url={gameUrl} type={type} />
    ) : (
      <ShowButton url={gameUrl} type={type} />
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
              type="button"
              className="btn btn-sm btn-outline-secondary border-0"
              onClick={() => copy(`${window.location.host}${gameUrl}`)}
              data-toggle="tooltip"
              data-placement="right"
              title="Copy link"
              aria-label="Copy link"
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
              aria-label="Cancel game"
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
            aria-label="Copy link"
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
            aria-label="Cancel game"
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
