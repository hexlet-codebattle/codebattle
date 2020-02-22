import React from 'react';
import { makeCreateGameUrlDefault } from '../utils/urlBuilders';
import DropdownMenuDefault from './DropdownMenuDefault';

const SelectorPlayWithFriend = ({ timeoutSeconds, renderStartNewGameButton }) => {
  const renderLevel = level => {
    const gameUrl = makeCreateGameUrlDefault(level, 'withFriend', timeoutSeconds);
    return renderStartNewGameButton(level, gameUrl);
  };

  return (
    <div className="dropdown">
      <button
        id="btnGroupPlayWithFriend"
        type="button"
        className="btn btn-outline-success dropdown-toggle"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <i className="fa fa-male mr-2" />
        Play with a friend
      </button>
      <div className="dropdown-menu" aria-labelledby="btnGroupPlayWithFriend">
        <DropdownMenuDefault
          renderLevel={renderLevel}
        />
      </div>
    </div>
  );
};

export default SelectorPlayWithFriend;
