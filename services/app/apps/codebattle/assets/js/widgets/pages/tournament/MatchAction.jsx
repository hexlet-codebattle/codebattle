import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import MatchStatesCodes from '../../config/matchStates';
import { toggleVisibleGameResult } from '../../middlewares/Tournament';

const handleToggleVisible = event => {
  const { gameId } = event.currentTarget.dataset;
  toggleVisibleGameResult(Number(gameId));
};

const ToggleVisibleGameButton = ({ gameId, canModerate }) => (
  canModerate ? (
    <button
      type="button"
      data-game-id={gameId}
      className="btn btn-success btn-sm text-white rounded-lg px-3 mr-1"
      onClick={handleToggleVisible}
    >
      <FontAwesomeIcon className="mr-2" icon="eye" />
      Toggle visible
    </button>
  ) : (<></>)
);

function MatchAction({
  match,
  currentUserIsPlayer,
  canModerate,
}) {
  const href = `/games/${match.gameId}`;

  switch (match.state) {
    case MatchStatesCodes.pending:
      return (
        <a
          href={href}
          title="Show match"
          className="btn btn-primary btn-sm rounded-lg px-3"
          disabled
        >
          <FontAwesomeIcon className="mr-2" icon="eye" />
          Show
        </a>
      );
    case MatchStatesCodes.playing: {
      if (currentUserIsPlayer) {
        return (
          <>
            <ToggleVisibleGameButton
              gameId={match.gameId}
              canModerate={canModerate}
            />
            <a
              href={href}
              title="Continue match"
              className="btn btn-success btn-sm text-white rounded-lg px-3"
            >
              <FontAwesomeIcon className="mr-2" icon="laptop-code" />
              Continue
            </a>
          </>
        );
      }

      return (
        <>
          <ToggleVisibleGameButton
            gameId={match.gameId}
            canModerate={canModerate}
          />
          <a
            href={href}
            title="Show match"
            className="btn btn-primary btn-sm rounded-lg px-3"
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            Show
          </a>
        </>
      );
    }
    case MatchStatesCodes.canceled:
    case MatchStatesCodes.timeout:
    case MatchStatesCodes.gameOver:
      return (
        <>
          <ToggleVisibleGameButton
            gameId={match.gameId}
            canModerate={canModerate}
          />
          <a
            href={href}
            title="Show game history"
            className="btn btn-primary btn-sm rounded-lg px-3"
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            Show
          </a>
        </>
      );
    default:
      throw new Error(`Invalid Match state: ${match.state}`);
  }
}

export default memo(MatchAction);
