import React from 'react';
import DropdownMenuDefault from './DropdownMenuDefault';
import { makeCreateGameBotUrl } from '../utils/urlBuilders';

const PlayWithBotDropdown = ({ activeGames, renderStartNewGameButton }) => {
  const gamesWithBot = activeGames.filter(game => game.isBot);
  const selectGameByLevel = type => gamesWithBot.find(game => game.level === type);
  const getGameId = level => selectGameByLevel(level).id;
  const renderLevel = level => {
    const gameId = getGameId(level);
    const gameUrl = makeCreateGameBotUrl(gameId, 'join');
    return renderStartNewGameButton(level, gameUrl);
  };
  return (
    <div className="dropdown">
      <button
        id="btnGroupPlayWithBot"
        type="button"
        className="btn btn-outline-success dropdown-toggle"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <i className="fa fa-robot mr-2" />
        Play with the bot
      </button>
      <div className="dropdown-menu" aria-labelledby="btnGroupPlayWithBot">
        <DropdownMenuDefault
          renderLevel={renderLevel}
        />
      </div>
    </div>
  );
};

export default PlayWithBotDropdown;
