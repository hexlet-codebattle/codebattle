import React from 'react';
import { makeCreateGameUrlDefault } from '../utils/urlBuilders';
import DropdownMenuDefault from './DropdownMenuDefault';

const SelectorStartNewGame = ({ renderStartNewGameButton }) => {
  const renderLevel = level => {
    const gameUrl = makeCreateGameUrlDefault(level, 'withRandomPlayer');
    return renderStartNewGameButton(level, gameUrl);
  };

  return (
    <div className="dropdown mr-sm-3 mr-0 mb-sm-0 mx-3">
      <button
        id="btnGroupStartNewGame"
        type="button"
        className="btn btn-success dropdown-toggle"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <i className="fa fa-random mr-2" />
        Create a game
      </button>
      <div className="dropdown-menu" aria-labelledby="btnGroupStartNewGame">
        <DropdownMenuDefault
          renderLevel={renderLevel}
        />
      </div>
    </div>
  );
};

export default SelectorStartNewGame;
