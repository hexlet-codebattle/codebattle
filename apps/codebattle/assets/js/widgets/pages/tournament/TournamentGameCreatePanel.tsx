import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import shuffle from 'lodash/shuffle';

import { Box, Button, Flex, NativeSelect, NumberInput, Text } from '@mantine/core';

import i18n from '../../../i18n';
import MatchStates from '../../config/matchStates';
import { createCustomRound } from '../../middlewares/TournamentAdmin';
import {
  getCustomEventPlayerDefaultImgUrl,
  tournamentEmptyPlayerUrl,
} from '../../utils/urlBuilders';

interface GamePlayer {
  id: number;
  name: string;
  isBot?: boolean;
  avatarUrl?: string;
  taskIds?: number[];
  [key: string]: unknown;
}

interface GameTask {
  id: number;
  level: 'elementary' | 'easy' | 'medium' | 'hard';
  [key: string]: unknown;
}

interface GameMatch {
  roundPosition: number;
  playerIds: number[];
  state: string;
  [key: string]: unknown;
}

interface TournamentGameCreatePanelProps {
  type?: string;
  players: Record<number, GamePlayer>;
  matches: Record<number, GameMatch>;
  taskList?: GameTask[];
  currentRoundPosition: number;
  defaultMatchTimeoutSeconds?: number;
}

const emptyPlayer: GamePlayer | Record<string, never> = {};

function TournamentGameCreatePanel({
  players,
  matches,
  taskList = [],
  currentRoundPosition,
  defaultMatchTimeoutSeconds,
}: TournamentGameCreatePanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<GamePlayer | undefined>(
    emptyPlayer as GamePlayer,
  );
  const [opponentPlayer, setOpponentPlayer] = useState<GamePlayer | undefined>(
    emptyPlayer as GamePlayer,
  );
  const [selectedTaskLevel, setSelectedTaskLevel] = useState<
    'elementary' | 'easy' | 'medium' | 'hard' | undefined
  >();
  const [selectedTimeoutSeconds, setSelectedTimeoutSeconds] = useState<number | undefined>();

  const activeMatch = useMemo(() => {
    if (!selectedPlayer) return null;

    const activeMatches = Object.values(matches).filter(
      (match) =>
        match.roundPosition === currentRoundPosition &&
        match.playerIds.includes(selectedPlayer.id) &&
        match.state === MatchStates.playing,
    );

    if (activeMatches.length === 0) {
      return null;
    }
    return activeMatches[0];
  }, [selectedPlayer, matches, currentRoundPosition]);

  const availableTasks = useMemo(
    () =>
      taskList.reduce<Record<GameTask['level'], GameTask[]>>(
        (acc, task) => {
          if (selectedPlayer && players[selectedPlayer.id]?.taskIds?.includes(task.id)) {
            return acc;
          }

          acc[task.level].push(task);

          return acc;
        },
        {
          elementary: [],
          easy: [],
          medium: [],
          hard: [],
        },
      ),
    [selectedPlayer, players, taskList],
  );

  const clearSelectedPlayer = useCallback(() => {
    setSelectedPlayer(undefined);
    setOpponentPlayer(undefined);
    setSelectedTaskLevel(undefined);
  }, [setSelectedPlayer, setOpponentPlayer, setSelectedTaskLevel]);
  const clearSelectedTaskLevel = useCallback(() => {
    setSelectedTaskLevel(undefined);
  }, [setSelectedTaskLevel]);

  useEffect(() => {
    if (selectedPlayer === emptyPlayer) {
      const playersListWithoutBots = Object.values(players).filter((player) => !player.isBot);

      if (playersListWithoutBots.length === 1) {
        setSelectedPlayer(playersListWithoutBots[0]);
      } else if (playersListWithoutBots.length === 2) {
        setSelectedPlayer(playersListWithoutBots[0]);
        setOpponentPlayer(playersListWithoutBots[1]);
      }
    }
  }, [players, selectedPlayer]);

  return (
    <Flex
      justify="space-between"
      w="100%"
      p="md"
      mb="xs"
      style={{ border: '1px solid #4c4c5a', borderRadius: 'var(--mantine-radius-md)' }}
    >
      {!selectedPlayer && (
        <>
          <Box
            component="img"
            alt={i18n.t('Waiting opponent avatar')}
            src={tournamentEmptyPlayerUrl}
            display={{ base: 'none', md: 'block' }}
            className="cb-tournament-profile-avatar bg-gray"
            style={{ padding: '1rem', borderRadius: 'var(--mantine-radius-md)' }}
          />
          <Flex justify="space-between" align="center" direction="column">
            <NativeSelect
              data={[
                { value: '', label: i18n.t('Choose player'), disabled: true },
                ...Object.values(players)
                  .filter((player) => !player.isBot)
                  .map((player) => ({
                    value: String(player.id),
                    label: player.name,
                  })),
              ]}
              defaultValue=""
              onChange={(e) => setSelectedPlayer(players[Number(e.currentTarget.value)])}
              m="xs"
            />
          </Flex>
        </>
      )}
      {selectedPlayer && !selectedTaskLevel && (
        <>
          <Flex direction="column" align="baseline" wrap="nowrap">
            <Text fw={500}>
              {i18n.t('Choose task level for')}{' '}
              <Text span style={{ whiteSpace: 'nowrap' }}>
                {selectedPlayer.name}
              </Text>
              {opponentPlayer?.name && (
                <>
                  <Text span mx="sm">
                    vs
                  </Text>
                  <Text span style={{ whiteSpace: 'nowrap' }}>
                    {opponentPlayer.name}
                  </Text>
                </>
              )}
              :
            </Text>
            <Flex gap={4} wrap="wrap">
              <Button
                size="compact-sm"
                color="cbSecondary"
                radius="md"
                onClick={() => setSelectedTaskLevel('elementary')}
                disabled={availableTasks.elementary.length < 1}
              >
                {i18n.t('Elementary')}{' '}
                <Text span style={{ whiteSpace: 'nowrap' }}>
                  {i18n.t('(%{count} available)', {
                    count: availableTasks.elementary.length,
                  })}
                </Text>
              </Button>
              <Button
                size="compact-sm"
                color="cbSecondary"
                radius="md"
                onClick={() => setSelectedTaskLevel('easy')}
                disabled={availableTasks.easy.length < 1}
              >
                {i18n.t('Easy')} {availableTasks.easy.length}
              </Button>
              <Button
                size="compact-sm"
                color="yellow"
                radius="md"
                onClick={() => setSelectedTaskLevel('medium')}
                disabled={availableTasks.medium.length < 1}
              >
                {i18n.t('Medium')} {availableTasks.medium.length}
              </Button>
              <Button
                size="compact-sm"
                color="red"
                radius="md"
                onClick={() => setSelectedTaskLevel('hard')}
                disabled={availableTasks.hard.length < 1}
              >
                {i18n.t('Hard')} {availableTasks.hard.length}
              </Button>
            </Flex>
          </Flex>
          <div>
            <Button
              variant="subtle"
              size="compact-sm"
              color="gray"
              onClick={clearSelectedPlayer}
              disabled
            >
              <FontAwesomeIcon icon="times" />
            </Button>
          </div>
        </>
      )}
      {selectedPlayer && selectedTaskLevel && (
        <>
          <Flex w="100%">
            <Flex direction="column" align="center" pr="xs">
              <Box
                component="img"
                alt={`${selectedPlayer.name} avatar`}
                src={selectedPlayer.avatarUrl || getCustomEventPlayerDefaultImgUrl(selectedPlayer)}
                display={{ base: 'none', md: 'block' }}
                className="cb-tournament-profile-avatar"
                style={{ padding: '0.5rem', borderRadius: 'var(--mantine-radius-md)' }}
              />
              {opponentPlayer && (
                <>
                  vs
                  <Box
                    component="img"
                    alt={`${opponentPlayer.name} avatar`}
                    src={
                      opponentPlayer.avatarUrl ||
                      getCustomEventPlayerDefaultImgUrl(opponentPlayer) ||
                      tournamentEmptyPlayerUrl
                    }
                    display={{ base: 'none', md: 'block' }}
                    className="cb-tournament-profile-avatar"
                    style={{ padding: '0.5rem', borderRadius: 'var(--mantine-radius-md)' }}
                  />
                </>
              )}
            </Flex>
            <Flex direction="column" justify="center">
              <Text p={4} style={{ whiteSpace: 'nowrap' }}>
                {i18n.t('Player: %{name}', { name: selectedPlayer.name })}
              </Text>
              {opponentPlayer?.name && (
                <Text p={4} style={{ whiteSpace: 'nowrap' }}>
                  {i18n.t('Opponent: %{name}', { name: opponentPlayer.name })}
                </Text>
              )}
              <Flex align="baseline" px="xs">
                <Text style={{ whiteSpace: 'nowrap' }}>
                  {i18n.t('Level: %{level} (%{count} available)', {
                    level: i18n.t(selectedTaskLevel),
                    count: availableTasks[selectedTaskLevel].length,
                  })}
                </Text>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  color="gray"
                  onClick={clearSelectedTaskLevel}
                >
                  <FontAwesomeIcon icon="pen" />
                </Button>
              </Flex>
              <Flex align="baseline" px="xs">
                <NumberInput
                  id="round-seconds"
                  name="round-seconds"
                  aria-label={i18n.t('Round timeout seconds')}
                  min={180}
                  max={7200}
                  step={60}
                  placeholder={
                    defaultMatchTimeoutSeconds === undefined
                      ? undefined
                      : String(defaultMatchTimeoutSeconds)
                  }
                  value={selectedTimeoutSeconds ?? ''}
                  onChange={(value) => {
                    const newTimeout = Number(value);

                    if (newTimeout >= 180 && newTimeout <= 7200) {
                      setSelectedTimeoutSeconds(newTimeout);
                    } else if (newTimeout <= 180) {
                      setSelectedTimeoutSeconds(180);
                    } else if (newTimeout >= 7200) {
                      setSelectedTimeoutSeconds(7200);
                    }
                  }}
                  pr="xs"
                />
                <Text component="label" htmlFor="round-seconds" ml="xs">
                  {i18n.t('Match seconds')}
                </Text>
              </Flex>
              {activeMatch ? (
                <Button size="compact-sm" color="cbSecondary" radius="md" disabled>
                  {i18n.t('Round already started')}
                </Button>
              ) : (
                <Button
                  size="compact-sm"
                  color="cbSecondary"
                  radius="md"
                  leftSection={<FontAwesomeIcon icon="play" />}
                  onClick={() => {
                    createCustomRound({
                      task_id: shuffle(availableTasks[selectedTaskLevel])[0]?.id,
                      timeout_seconds: selectedTimeoutSeconds,
                    });
                  }}
                  disabled={availableTasks[selectedTaskLevel].length < 1}
                >
                  {i18n.t('Start round')}
                </Button>
              )}
            </Flex>
          </Flex>
          <div>
            <Button
              variant="subtle"
              size="compact-sm"
              color="gray"
              onClick={clearSelectedPlayer}
              disabled
            >
              <FontAwesomeIcon icon="times" />
            </Button>
          </div>
        </>
      )}
    </Flex>
  );
}

export default TournamentGameCreatePanel;
