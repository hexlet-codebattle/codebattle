import React, { useState } from 'react';

import GameLevelBadge from '../../components/GameLevelBadge';
import ResultIcon from '../../components/ResultIcon';
import UserInfo from '../../components/UserInfo';
import { loadSimpleUserStats } from '../../middlewares/Users';

import GameActionButton from './GameActionButton';
import GameProgressBar from './GameProgressBar';
import GameStateBadge from './GameStateBadge';

const getPerfomance = (won, lost) => {
  if (lost === 0) {
    return won;
  }

  if (won === 0) {
    return -1 * lost;
  }

  const diff = won / lost;

  const [int, rest] = String(diff).split('.');

  if (!rest) {
    return int;
  }

  return `${int}.${rest.slice(0, 2)}`;
};

function UserSimpleStats({
  user,
}) {
  const [state, setState] = useState('closed');
  const [data, setData] = useState();

  const load = () => {
    const onSuccess = payload => {
      setData(payload.data.stats.games);
      setState('opened');
    };
    const onFailure = () => {
      setState('error');
    };

    setState('loading');
    loadSimpleUserStats(onSuccess, onFailure)(user);
  };

  return (
    <>
      {state === 'loading' && (
        <button
          type="button"
          className="btn btn-sm btn-secondary rounded-lg"
          disabled
        >
          Loading...
        </button>
      )}
      {state === 'closed' && (
        <button
          type="button"
          className="btn btn-sm btn-success text-nowrap text-white rounded-lg"
          onClick={load}
        >
          Show stats
        </button>
      )}
      {state === 'opened' && (
        <span className="text-nowrap">{`Won/Lost: ${getPerfomance(data.won, data.lost)}`}</span>
      )}
      {state === 'error' && (
        <button
          type="button"
          className="btn btn-sm btn-danger rounded-lg"
          onClick={load}
        >
          Reload
        </button>
      )}
    </>
  );
}

function GameCard({
  type,
  game,
  currentUserId = null,
  isGuest = true,
  isOnline = false,
}) {
  return (
    <div
      key={`card-${game.id}`}
      className="d-flex flex-column game-item shadow-sm p-2 mx-2 bg-white border rounded-lg"
    >
      <div className="d-flex mb-2 h-100">
        <div className="d-flex flex-column justify-content-around mr-2">
          <div className="mb-2">
            <GameLevelBadge level={game.level} />
          </div>
          <GameStateBadge state={game.state} />
        </div>
        <div className="d-flex flex-column align-self-center">
          {game.players.length === 1 ? (
            <>
              <div className="d-flex flex-column align-items-center">
                <UserInfo user={game.players[0]} />
                {currentUserId !== game.players[0] && (
                  <UserSimpleStats user={game.players[0]} />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="d-flex flex-column align-items-center position-relative">
                <div className="d-flex">
                  <ResultIcon gameId={game.id} player1={game.players[0]} player2={game.players[1]} />
                  <UserInfo user={game.players[0]} />
                </div>
                {
                    type === 'active'
                      && <GameProgressBar player={game.players[0]} position="left" />
                }
              </div>
              <span className="text-center">VS</span>
              <div className="d-flex flex-column align-items-center position-relative">
                <div className="d-flex align-items-center">
                  <ResultIcon gameId={game.id} player1={game.players[1]} player2={game.players[0]} />
                  <UserInfo user={game.players[1]} />
                </div>
                {
                    type === 'active'
                      && <GameProgressBar player={game.players[1]} position="left" />
                }
              </div>
            </>
          )}
        </div>
      </div>
      {type === 'active' && (
        <GameActionButton
          type="card"
          game={game}
          currentUserId={currentUserId}
          isGuest={isGuest}
          isOnline={isOnline}
        />
      )}
      {type === 'completed' && (
        <a type="button" className="btn btn-secondary btn-sm rounded-lg" href={`/games/${game.id}`}>
          Show
        </a>
      )}
    </div>
  );
}

export default GameCard;
