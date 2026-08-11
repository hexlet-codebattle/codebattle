import React from 'react';

import { Box, Button, Flex, Loader, Stack, Text } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { getGradeLabel } from '@/config/grades';

import i18n from '../../../i18n';
import dayjs from '../../../i18n/dayjs';
import { localizeTournamentName } from '../../utils/localizeTournamentName';

interface HistoryWinner {
  id?: number | string;
  name?: string;
  avatarUrl?: string;
}

export interface HistoryTournament {
  id: number | string;
  name: string;
  grade?: string;
  type?: string;
  state?: string;
  startsAt?: string;
  lastRoundEndedAt?: string;
  playersCount?: number;
  winner?: HistoryWinner | null;
}

interface TournamentHistoryListProps {
  tournaments: HistoryTournament[];
  loading: boolean;
}

const formatDuration = (t: HistoryTournament): string | null => {
  if (!t.startsAt || !t.lastRoundEndedAt) {
    return null;
  }

  const minutes = dayjs(t.lastRoundEndedAt).diff(dayjs(t.startsAt), 'minute');

  if (minutes <= 0) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
};

function TournamentHistoryList({ tournaments, loading }: TournamentHistoryListProps) {
  if (loading) {
    return (
      <Flex justify="center" align="center" py="xl" className="cb-text">
        <Loader />
        <Text ml="md">{i18n.t('Loading...')}</Text>
      </Flex>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Flex justify="center" align="center" py="xl" className="cb-text">
        {i18n.t('No finished tournaments yet')}
      </Flex>
    );
  }

  return (
    <Stack className="cb-schedule-list" gap={0}>
      <Flex
        className="cb-schedule-list-head"
        display={{ base: 'none', md: 'flex' }}
        align="center"
        px="md"
        py="sm"
      >
        <span className="cb-schedule-col-grade">{i18n.t('Tournament')}</span>
        <span className="cb-schedule-col-date">{i18n.t('Date')}</span>
        <span className="cb-schedule-col-duration">{i18n.t('Duration')}</span>
        <span className="cb-schedule-col-players">{i18n.t('Players')}</span>
        <span className="cb-schedule-col-winner">{i18n.t('Winner')}</span>
        <span className="cb-schedule-col-action" />
      </Flex>
      {tournaments.map((t) => {
        const duration = formatDuration(t);

        return (
          <Flex
            key={t.id}
            component="a"
            href={`/tournaments/${t.id}`}
            className="cb-schedule-list-row"
            direction={{ base: 'column', md: 'row' }}
            align={{ md: 'center' }}
            px="md"
            py="md"
            style={
              {
                '--cb-row-grade': `var(--cb-grade-${t.grade})`,
              } as React.CSSProperties
            }
          >
            <Flex component="span" align="center" className="cb-schedule-col-grade">
              <Box
                component="span"
                className="cb-schedule-grade-dot"
                mr="sm"
                style={{ backgroundColor: `var(--cb-grade-${t.grade})` }}
              />
              <Flex component="span" direction="column">
                <span className="cb-schedule-row-name">
                  {localizeTournamentName(t.name, t.grade)}
                </span>
                <small className="cb-schedule-row-grade-label">
                  {t.grade ? i18n.t(getGradeLabel(t.grade)) : null}
                </small>
              </Flex>
            </Flex>
            <span className="cb-schedule-col-date">
              {t.startsAt ? dayjs(t.startsAt).format('MMM D, YYYY') : '—'}
            </span>
            <span className="cb-schedule-col-duration">{duration || '—'}</span>
            <Flex component="span" align="center" gap="xs" className="cb-schedule-col-players">
              <FontAwesomeIcon icon="users" aria-hidden="true" />
              {t.playersCount ?? 0}
            </Flex>
            <Flex component="span" align="center" className="cb-schedule-col-winner">
              {t.winner ? (
                <>
                  {t.winner.avatarUrl && (
                    <Box
                      component="img"
                      src={t.winner.avatarUrl}
                      alt={t.winner.name}
                      className="cb-schedule-winner-avatar"
                      mr="sm"
                    />
                  )}
                  <Text component="span" truncate>
                    {t.winner.name}
                  </Text>
                </>
              ) : (
                '—'
              )}
            </Flex>
            <span className="cb-schedule-col-action">
              <Button component="span" size="compact-sm" color="cbSecondary" radius="md">
                {i18n.t('Open')}
              </Button>
            </span>
          </Flex>
        );
      })}
    </Stack>
  );
}

export default TournamentHistoryList;
