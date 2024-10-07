import React, {
  memo,
} from 'react';

import cn from 'classnames';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import UserInfo from '../../components/UserInfo';

import GameProgressBar from './GameProgressBar';

const Players = memo(({ players, isBot, gameId }) => {
  if (players.length === 1) {
    const badgeClassName = cn('badge badge-pill ml-2', {
      'badge-secondary': isBot,
      'badge-warning text-white': !isBot,
    });
    const tooltipId = `tooltip-${gameId}-${players[0].id}`;
    const tooltipInfo = isBot
      ? 'No points are awarded - Only for games with other players'
      : 'Points are awarded for winning this game';

    return (
      <td className="p-3 align-middle text-nowrap" colSpan={2}>
        <div className="d-flex align-items-center">
          <UserInfo user={players[0]} lang={players[0].editorLang} hideOnlineIndicator />
          <OverlayTrigger
            overlay={<Tooltip id={tooltipId}>{tooltipInfo}</Tooltip>}
            placement="right"
          >
            <span className={badgeClassName}>
              {isBot ? 'No rating' : 'Rating'}
            </span>
          </OverlayTrigger>
        </div>
      </td>
    );
  }

  return (
    <>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex flex-column position-relative">
          <UserInfo
            user={players[0]}
            lang={players[0].editorLang}
            hideOnlineIndicator
            loading={players[0].checkResult.status === 'started'}
          />
          <GameProgressBar player={players[0]} position="left" />
        </div>
      </td>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex flex-column position-relative">
          <UserInfo
            user={players[1]}
            lang={players[1].editorLang}
            hideOnlineIndicator
            loading={players[1].checkResult.status === 'started'}
          />
          <GameProgressBar player={players[1]} position="right" />
        </div>
      </td>
    </>
  );
});

export default Players;
