import React, { memo, useMemo } from 'react';

import { Anchor, Box, Flex, Text } from '@mantine/core';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import i18n from '../../../i18n';
import { gamePlayersSelector, userGameHeadToHeadSelector } from '../../selectors';

interface HeadToHeadPlayer {
  id: number;
  wins: number;
}

interface UserHeadToHeadProps {
  userId: number;
}

function UserHeadToHead({ userId }: UserHeadToHeadProps) {
  const { winnerId, players: rawPlayers } = useSelector(userGameHeadToHeadSelector);
  const players = rawPlayers as HeadToHeadPlayer[];
  const gamePlayers = useSelector(gamePlayersSelector);
  const opponentId = useMemo(
    () => Object.values(gamePlayers || {}).find((player) => player.id !== userId)?.id ?? null,
    [gamePlayers, userId],
  );

  const showHeadToHead = useMemo(
    () => players.reduce((acc, player) => acc + Number(player.wins), 0) > 0,
    [players],
  );

  if (!showHeadToHead) {
    return null;
  }

  const wins = players.find((player) => player.id === userId)?.wins ?? 0;
  const scoreClassName = cn({
    'cb-game-score-won': winnerId === userId,
    'cb-game-score-lost': winnerId !== null && winnerId !== userId,
    'cb-game-score-draw': winnerId === null,
  });
  const href = opponentId ? `/h2h/${userId}/${opponentId}` : null;

  const content = (
    <>
      <Text display={{ base: 'none', md: 'flex', lg: 'flex' }} component="span">
        H2H:
      </Text>
      {wins}
    </>
  );

  if (!href) {
    return (
      <Flex wrap="nowrap" ml="sm" ta="center" className={scoreClassName}>
        {content}
      </Flex>
    );
  }

  return (
    <Anchor
      href={href}
      className={scoreClassName}
      title={i18n.t('Open H2H')}
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        marginLeft: 'var(--mantine-spacing-sm)',
        textAlign: 'center',
        textDecoration: 'none',
      }}
    >
      {content}
    </Anchor>
  );
}

export default memo(UserHeadToHead);
