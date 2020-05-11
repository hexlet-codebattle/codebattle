import React from 'react';
import DropdownMenuDefault from './DropdownMenuDefault';
import { makeCreateGameUrlDefault } from '../utils/urlBuilders';

const PlayWithBotDropdown = ({ renderStartNewGameButton }) => {
  const renderLevel = level => {
    const gameUrl = makeCreateGameUrlDefault(level, 'bot', 7200);
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
