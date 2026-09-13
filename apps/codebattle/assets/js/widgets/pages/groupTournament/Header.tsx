import React, { useState, useEffect, type CSSProperties } from 'react';
import moment from 'moment';
import { Badge, Box, Button, Flex, Text, Title } from '@mantine/core';
import PictureInPicture from '@/components/PictureInPicture';
import i18n from '../../../i18n';
import useTimer from '../../utils/useTimer';
import { isOnBreak } from '../../utils/groupTournament';
import { type GroupTournament } from './types';

interface StatusBadge {
  color?: string;
  style?: CSSProperties;
  labelKey: string;
}

const monospace = 'var(--mantine-font-family-monospace)';

const statusBadge: Record<string, StatusBadge> = {
  active: {
    color: 'green',
    labelKey: 'Active',
  },
  finished: {
    color: 'gray',
    labelKey: 'Finished',
  },
  waiting_participants: {
    style: {
      backgroundColor: '#fffb47',
      color: 'black',
      border: '1px solid #fffb47',
    },
    labelKey: 'Ожидание начала',
  },
  loading: {
    style: {
      backgroundColor: '#fffb47',
      color: 'black',
      border: '1px solid #fffb47',
    },
    labelKey: 'Ожидание начала',
  },
};

interface WaitingStartTimerProps {
  startsAt?: string;
}

function WaitingStartTimer({ startsAt }: WaitingStartTimerProps) {
  const target = startsAt ? moment.utc(startsAt) : null;
  const [time, seconds] = useTimer(target) as [string, number];
  const overdue = !target || (target && target.local().diff(moment()) <= 0);
  const color = overdue ? '#7fdbff' : seconds <= 60 ? '#ff3b30' : '#ffe500';
  const label = overdue ? i18n.t('Tournament will start soon') : time;

  return (
    <Text
      span
      style={{
        fontFamily: monospace,
        fontSize: overdue ? '1.1rem' : '1.5rem',
        color,
        border: `1px solid ${color}`,
        borderRadius: '999px',
        padding: '0.5rem 1.5rem',
      }}
    >
      {label}
    </Text>
  );
}

interface TournamentTimerProps {
  groupTournament?: GroupTournament | null;
}

function TournamentTimer({ groupTournament }: TournamentTimerProps) {
  const roundStartedAt = groupTournament?.lastRoundStartedAt || groupTournament?.startedAt;
  const isSeedRound =
    groupTournament?.type === 'ranked' &&
    groupTournament?.hasSeedRound &&
    groupTournament?.currentRoundPosition === 1;
  const timeoutSeconds =
    (isSeedRound && groupTournament?.seedRoundTimeoutSeconds) ||
    groupTournament?.roundTimeoutSeconds;

  const startMoment = roundStartedAt ? moment.utc(roundStartedAt) : null;
  const onBreak = isOnBreak(groupTournament);

  const target = onBreak
    ? startMoment
    : startMoment && Number.isInteger(timeoutSeconds)
      ? startMoment.clone().add(timeoutSeconds, 'seconds')
      : null;

  const [time, seconds] = useTimer(target) as [string, number];

  const currentRound = groupTournament?.currentRoundPosition;
  const roundsCount = groupTournament?.roundsCount;
  const showRoundCounter =
    Number.isInteger(roundsCount) &&
    (roundsCount as number) > 1 &&
    Number.isInteger(currentRound) &&
    (currentRound as number) > 0;

  if (
    groupTournament?.isInfinite ||
    groupTournament?.state !== 'active' ||
    !target ||
    (!seconds && !time)
  ) {
    return null;
  }

  const checkingSolutions = !onBreak && seconds === 0;

  const color = onBreak
    ? '#7fdbff'
    : checkingSolutions
      ? '#7fdbff'
      : seconds <= 60
        ? '#ff3b30'
        : seconds <= 300
          ? '#ffe500'
          : '#ffffff';

  const label = onBreak
    ? `${i18n.t('Break')}: ${time}`
    : checkingSolutions
      ? i18n.t('Running solutions…')
      : time;

  return (
    <Flex align="center">
      {showRoundCounter && (
        <Text
          span
          mr="md"
          c="white"
          style={{ fontFamily: monospace, fontSize: '1.1rem', opacity: 0.85 }}
        >
          {`${i18n.t('Round')} ${currentRound}/${roundsCount}`}
        </Text>
      )}
      <Text
        span
        style={{
          fontFamily: monospace,
          fontSize: checkingSolutions ? '1.1rem' : '1.5rem',
          color,
          border: `1px solid ${color}`,
          borderRadius: '999px',
          padding: '0.5rem 1.5rem',
        }}
      >
        {label}
      </Text>
    </Flex>
  );
}

interface PipTimerContentProps {
  status?: string;
  groupTournament?: GroupTournament | null;
}

function PipTimerContent({ status, groupTournament }: PipTimerContentProps) {
  const isWaiting = status === 'waiting_participants';

  if (status === 'finished' || groupTournament?.state === 'finished') {
    return (
      <Text
        span
        c="white"
        fw={700}
        style={{
          fontSize: '1.5rem',
          padding: '0.5rem 1.5rem',
          borderRadius: '999px',
          backgroundColor: '#6c757d',
          border: '1px solid #6c757d',
        }}
      >
        {i18n.t('Finished')}
      </Text>
    );
  }

  const isTimerActive = !isWaiting && groupTournament?.state === 'active';

  return (
    <Flex direction="column" align="center" justify="center" ta="center" p="sm">
      {isWaiting ? (
        <WaitingStartTimer startsAt={groupTournament?.startsAt} />
      ) : isTimerActive ? (
        <TournamentTimer groupTournament={groupTournament} />
      ) : (
        <Text
          span
          style={{
            fontFamily: monospace,
            fontSize: '1.5rem',
            color: '#ffc107',
            border: '1px solid #ffc107',
            borderRadius: '999px',
            padding: '0.5rem 1.5rem',
          }}
        >
          {i18n.t((status && statusBadge[status]?.labelKey) || 'Group Tournament')}
        </Text>
      )}
    </Flex>
  );
}

interface HeaderProps {
  name?: string;
  status?: string;
  groupTournament?: GroupTournament | null;
}

function Header({ name, status, groupTournament }: HeaderProps) {
  const [isPipActive, setIsPipActive] = useState(false);
  const badge = (status && statusBadge[status]) || statusBadge.loading;
  const isWaiting = status === 'waiting_participants';
  const isPipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  useEffect(() => {
    if (!isPipSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsPipActive(true);
      }
    };

    const handleInteraction = () => {
      if (document.visibilityState === 'visible') {
        setIsPipActive(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [isPipSupported]);

  return (
    <Flex align="center" w="100%" pos="relative" className="cb-custom-event-profile">
      <Title order={4} mb={0} mr="md" c="white">
        {name || i18n.t('Group Tournament')}
      </Title>
      {!groupTournament?.isInfinite && groupTournament?.type !== 'seed_only' && (
        <Box
          pos="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {isWaiting ? (
            <WaitingStartTimer startsAt={groupTournament?.startsAt} />
          ) : (
            <TournamentTimer groupTournament={groupTournament} />
          )}
        </Box>
      )}
      <Flex align="center" ml="auto">
        <Badge
          color={badge.color}
          c="white"
          radius="xl"
          px="lg"
          py="sm"
          mr="md"
          fw={700}
          style={badge.style}
        >
          {i18n.t(badge.labelKey)}
        </Badge>
        <Button
          component="a"
          variant="default"
          radius="xl"
          px="lg"
          href="https://t.me/+Z0_UGvNt_yE4ODcy"
        >
          {i18n.t('Support')}
        </Button>
        <Button component="a" variant="default" radius="xl" px="lg" href="/">
          {i18n.t('Back to event')}
        </Button>
      </Flex>
      {isPipSupported && !groupTournament?.isInfinite && groupTournament?.type !== 'seed_only' && (
        <PictureInPicture
          isActive={isPipActive}
          onClose={() => setIsPipActive(false)}
          width={320}
          height={150}
        >
          <PipTimerContent status={status} groupTournament={groupTournament} />
        </PictureInPicture>
      )}
    </Flex>
  );
}

export default Header;
