import React, { memo, useContext, useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Flex, Image, Text, Title } from '@mantine/core';
import cn from 'classnames';
import { useDispatch } from 'react-redux';

import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import { uploadPlayers } from '@/middlewares/Tournament';
import { type AppDispatch } from '@/slices/store';

import i18next from '../../../i18n';
import MatchStateCodes from '../../config/matchStates';
import {
  getCustomEventPlayerDefaultImgUrl,
  tournamentEmptyPlayerUrl,
} from '../../utils/urlBuilders';
import useMatchesStatistics from '../../utils/useMatchesStatistics';

interface StagePlayer {
  id?: number;
  name?: string;
  clan?: string;
  clanId?: number;
  avatarUrl?: string;
  [key: string]: unknown;
}

// useMatchesStatistics returns loose stats objects; `score` is read here but not
// part of the hook's declared PlayerStatistics type.
interface StageStats {
  winMatches: unknown[];
  score: number;
  avgTests: number;
  avgDuration: number;
}

interface StageStatusProps {
  playerId: number;
  matchList: Parameters<typeof useMatchesStatistics>[1];
  matchState?: string;
}

function StageStatus({ playerId, matchList, matchState }: StageStatusProps) {
  const [player, opponent] = useMatchesStatistics(playerId, matchList) as unknown as [
    StageStats,
    StageStats,
  ];

  if (matchState === MatchStateCodes.playing) {
    return (
      <Text component="span" c="blue">
        {i18next.t('Active match')}
      </Text>
    );
  }

  if (
    player.winMatches.length === opponent.winMatches.length &&
    player.score === opponent.score &&
    player.avgTests === opponent.avgTests &&
    player.avgDuration === opponent.avgDuration
  ) {
    return (
      <Text component="span" c="dimmed">
        {i18next.t('Draw')}
      </Text>
    );
  }

  if (
    player.score > opponent.score ||
    (player.score === opponent.score && player.winMatches.length > opponent.winMatches.length) ||
    (player.winMatches.length === opponent.winMatches.length &&
      player.score === opponent.score &&
      player.avgTests > opponent.avgTests) ||
    (player.winMatches.length === opponent.winMatches.length &&
      player.score === opponent.score &&
      player.avgTests === opponent.avgTests &&
      player.avgDuration > opponent.avgDuration)
  ) {
    return (
      <Text component="span" c="green">
        {i18next.t('You win')}
      </Text>
    );
  }

  return (
    <Text component="span" c="red">
      {i18next.t('You lose')}
    </Text>
  );
}

interface StageCardProps {
  playerId: number;
  opponentId: number;
  players: Record<number, StagePlayer | undefined>;
  lastGameId?: number;
  lastMatchState?: string;
  matchList: Parameters<typeof useMatchesStatistics>[1];
  isBanned?: boolean;
}

function StageCard({
  playerId,
  opponentId,
  // stage,
  // stagesLimit,
  players,
  lastGameId,
  lastMatchState,
  matchList,
  isBanned,
}: StageCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const opponent = players[opponentId];

  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const bunnedBtnClassName = hasCustomEventStyle ? 'cb-custom-event-btn-danger' : undefined;
  const openBtnClassName = hasCustomEventStyle ? 'cb-custom-event-btn-primary' : undefined;

  useEffect(() => {
    if (!opponent && opponentId) {
      dispatch(uploadPlayers([opponentId]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Flex direction={{ base: 'column', md: 'row' }} p="xs" w="100%">
      {opponent ? (
        <>
          <Box hiddenFrom="md" style={{ display: 'none' }} />
          <Image
            alt={`${opponent.name} avatar`}
            src={
              opponent.avatarUrl ||
              getCustomEventPlayerDefaultImgUrl(opponent) ||
              tournamentEmptyPlayerUrl
            }
            className="cb-tournament-profile-avatar p-2"
            radius="md"
            visibleFrom="md"
            style={{ alignSelf: 'center' }}
          />
          <Flex
            direction="column"
            justify="center"
            align={{ base: 'center', md: 'flex-start' }}
            pl={{ base: 0, md: 'md' }}
          >
            <Title order={6} className="cb-custom-event-name p-1" style={{ maxWidth: 300 }}>
              {`${i18next.t('Opponent')}: ${opponent.name}`}
            </Title>
            {opponent.clanId && (
              <Title order={6} className="cb-custom-event-name p-1" style={{ maxWidth: 250 }}>
                {`${i18next.t('Opponent clan')}: ${opponent.clan}`}
              </Title>
            )}
            <Title order={6} className="p-1">
              {`${i18next.t('Status')}: `}
              <StageStatus playerId={playerId} matchList={matchList} matchState={lastMatchState} />
            </Title>
            <Flex>
              {isBanned ? (
                <Button
                  component="a"
                  href="_blank"
                  color="red"
                  radius="md"
                  m={4}
                  px="lg"
                  disabled
                  className={bunnedBtnClassName}
                  leftSection={<FontAwesomeIcon icon="ban" />}
                >
                  {i18next.t('You banned')}
                </Button>
              ) : (
                <Button
                  component="a"
                  href={`/games/${lastGameId}`}
                  color="cbSecondary"
                  radius="md"
                  m={4}
                  px="lg"
                  className={openBtnClassName}
                  leftSection={<FontAwesomeIcon icon="eye" />}
                >
                  {i18next.t('Open match')}
                </Button>
              )}
            </Flex>
          </Flex>
        </>
      ) : (
        <>
          <Image
            alt={i18next.t('Waiting opponent avatar')}
            src={tournamentEmptyPlayerUrl}
            className="cb-tournament-profile-avatar bg-gray p-3"
            radius="md"
            visibleFrom="md"
            style={{ alignSelf: 'center' }}
          />
          <Flex direction="column" justify="center" pl={{ base: 0, md: 'md' }}>
            <Title order={6} className="p-1">{`${i18next.t('Opponent')}: ?`}</Title>
            <Title order={6} className="p-1">
              {`${i18next.t('Status')}: `}
              <span className="cb-tournament-status">{i18next.t('Waiting')}</span>
            </Title>
            <Title order={6} className="p-1 text-muted">
              {i18next.t('Wait round starts')}
            </Title>
          </Flex>
        </>
      )}
    </Flex>
  );
}

export default memo(StageCard);
