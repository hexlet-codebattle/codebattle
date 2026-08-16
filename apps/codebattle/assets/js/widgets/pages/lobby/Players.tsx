import React, { memo } from 'react';

import { Flex, Table } from '@mantine/core';

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

const truncatedCellStyle = {
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const Players = memo(({ players }: PlayersProps) => {
  if (players.length === 1) {
    return (
      <Table.Td colSpan={2} style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
        <Flex align="center">
          <UserInfo user={players[0]} lang={players[0].editorLang} hideOnlineIndicator />
        </Flex>
      </Table.Td>
    );
  }

  return (
    <>
      <Table.Td className="cb-username-td" style={truncatedCellStyle}>
        <Flex direction="column" pos="relative">
          <UserInfo
            user={players[0]}
            lang={players[0].editorLang}
            hideOnlineIndicator
            loading={players[0].checkResult.status === 'started'}
          />
          <GameProgressBar player={players[0]} position="left" />
        </Flex>
      </Table.Td>
      <Table.Td className="cb-username-td" style={truncatedCellStyle}>
        <Flex direction="column" pos="relative">
          <UserInfo
            user={players[1]}
            lang={players[1].editorLang}
            hideOnlineIndicator
            loading={players[1].checkResult.status === 'started'}
          />
          <GameProgressBar player={players[1]} position="right" />
        </Flex>
      </Table.Td>
    </>
  );
});

export default Players;
