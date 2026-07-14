import React, { memo } from 'react';

import { type UserNameUser } from '../../components/UserName';
import UserInfo from '../../components/UserInfo';

import GameProgressBar, { type CheckResult } from './GameProgressBar';

interface LobbyPlayer extends UserNameUser {
  editorLang?: string;
  checkResult: CheckResult;
}

interface PlayersProps {
  players: LobbyPlayer[];
  mode?: string;
  gameId?: number;
  isBot?: boolean;
}

export type { LobbyPlayer };

const Players = memo(({ players, mode }: PlayersProps) => {
  if (players.length === 1) {
    return (
      <td className="p-3 align-middle text-nowrap" colSpan={2}>
        <div className="d-flex align-items-center">
          <UserInfo user={players[0]} lang={players[0].editorLang} hideOnlineIndicator />
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
