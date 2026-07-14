import React, { useState } from 'react';

import GameLevelBadge from '../../components/GameLevelBadge';
import ResultIcon from '../../components/ResultIcon';
import UserInfo from '../../components/UserInfo';
import { loadSimpleUserStats } from '../../middlewares/Users';
import getGamePlayersData from '../../utils/gamePlayers';

import { type UserNameUser } from '../../components/UserName';

import GameActionButton, { type LobbyGame } from './GameActionButton';
import GameProgressBar, { type CheckResult } from './GameProgressBar';
import GameStateBadge from './GameStateBadge';

interface CardPlayerData extends UserNameUser {
  editorLang?: string;
  checkResult: CheckResult;
}

interface CardPlayer {
  data: CardPlayerData;
  icon?: {
    name: 'gaveUp' | 'won';
    tooltip: { id: string; text: string };
  } | null;
}

const getPerfomance = (won: number, lost: number): number | string => {
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

interface UserGamesStats {
  won: number;
  lost: number;
}

interface UserSimpleStatsProps {
  user: CardPlayerData;
}

function UserSimpleStats({ user }: UserSimpleStatsProps) {
  const [state, setState] = useState('closed');
  const [data, setData] = useState<UserGamesStats | undefined>();

  const load = () => {
    const onSuccess = (payload: { stats: { games: UserGamesStats } }) => {
      setData(payload.stats.games);
      setState('opened');
    };
    const onFailure = () => {
      setState('error');
    };

    setState('loading');
    loadSimpleUserStats(onSuccess, onFailure)({ id: Number(user.id) });
  };

  return (
    <>
      {state === 'loading' && (
        <button
          type="button"
          className="btn btn-sm btn-secondary cb-btn-secondary cb-rounded"
          disabled
        >
          Loading...
        </button>
      )}
      {state === 'closed' && (
        <button
          type="button"
          className="btn btn-sm btn-success cb-btn-success cb-btn-success text-nowrap text-white cb-rounded"
          onClick={load}
        >
          Show stats
        </button>
      )}
      {state === 'opened' && (
        <span className="text-nowrap">
          {`Won/Lost: ${getPerfomance(data?.won ?? 0, data?.lost ?? 0)}`}
        </span>
      )}
      {state === 'error' && (
        <button type="button" className="btn btn-sm btn-danger cb-rounded" onClick={load}>
          Reload
        </button>
      )}
    </>
  );
}

interface GameCardProps {
  type: 'active' | 'completed';
  game: LobbyGame;
  currentUserId?: number | null;
  isGuest?: boolean;
  isOnline?: boolean;
}

function GameCard({
  type,
  game,
  currentUserId = null,
  isGuest = true,
  isOnline = false,
}: GameCardProps) {
  const { player1, player2 } = getGamePlayersData(game) as unknown as {
    player1: CardPlayer;
    player2: CardPlayer;
  };

  return (
    <div
      key={`card-${game.id}`}
      className="d-flex flex-column game-item cb-bg-panel shadow-sm p-2 mx-2 border cb-border-color cb-rounded"
    >
      <div className="d-flex mb-2 h-100">
        <div className="d-flex flex-column justify-content-around mr-2 bg-gray p-2 cb-rounded">
          <div className="mb-2">
            <GameLevelBadge level={game.level} />
          </div>
          <GameStateBadge state={game.state} />
        </div>
        <div className="d-flex flex-column align-self-center">
          {game.players.length === 1 ? (
            <div className="d-flex flex-column align-items-center">
              <UserInfo user={player1.data} lang={player1.data.editorLang} />
              {currentUserId !== player1.data.id && <UserSimpleStats user={player1.data} />}
            </div>
          ) : (
            <>
              <div className="d-flex flex-column align-items-center position-relative">
                <div className="d-flex align-items-center">
                  <ResultIcon icon={player1.icon} />
                  <UserInfo user={player1.data} lang={player1.data.editorLang} />
                </div>
                {type === 'active' && <GameProgressBar player={player1.data} position="left" />}
              </div>
              <span className="text-center">VS</span>
              <div className="d-flex flex-column align-items-center position-relative">
                <div className="d-flex align-items-center">
                  <ResultIcon icon={player2.icon} />
                  <UserInfo user={player2.data} lang={player2.data.editorLang} />
                </div>
                {type === 'active' && <GameProgressBar player={player2.data} position="left" />}
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
        <a
          type="button"
          className="btn btn-secondary cb-btn-secondary btn-sm cb-rounded"
          href={`/games/${game.id}`}
        >
          Show
        </a>
      )}
    </div>
  );
}

export default GameCard;
