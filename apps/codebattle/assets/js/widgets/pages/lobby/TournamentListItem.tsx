import React from 'react';

import NiceModal from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ActionIcon, Box, Button, Flex, Paper, Text } from '@mantine/core';

import getIconForGrade from '@/components/icons/Grades';
import TournamentTimer from '@/components/TournamentTimer';
import { getRankingPoints, grades } from '@/config/grades';
import ModalCodes from '@/config/modalCodes';
import { getTournamentUrl } from '@/utils/urlBuilders';

import i18n from '../../../i18n';
import dayjs from '../../../i18n/dayjs';
import tournamentStates from '../../config/tournament';
import { localizeTournamentName } from '../../utils/localizeTournamentName';

import { type LobbyTournament } from './TournamentCard';

const iconSize = { width: '22px', height: '22px' };

const mapTournamentTitleByState = {
  [tournamentStates.waitingParticipants]: 'Waiting Players',
  [tournamentStates.active]: 'Playing',
  [tournamentStates.canceled]: 'Canceled',
  [tournamentStates.finished]: 'Finished',
};

const getDateFormat = (grade?: string) => {
  switch (grade) {
    case grades.open:
      return `MMM D, YYYY [${i18n.t('at')}] h:mma`;
    default:
      return `[${i18n.t('at')}] h:mma`;
  }
};

const getActionText = () => i18n.t('Show');

const formatDate = (date: string | undefined, format: string) => {
  const parsedDate = dayjs(date);

  return parsedDate.isValid() ? parsedDate.format(format) : null;
};

const formatTournamentDate = (date: string | undefined, grade?: string) =>
  formatDate(date, getDateFormat(grade));

interface TournamentTitleProps {
  tournament: LobbyTournament;
}

function TournamentTitle({ tournament }: TournamentTitleProps) {
  const title = localizeTournamentName(tournament.name, tournament.grade);

  if (tournament.grade === grades.open) {
    return (
      <Text
        component="span"
        title={title}
        fw={700}
        c="white"
        mb="xs"
        truncate
        className="h5 cb-tournament-title"
      >
        {title}
      </Text>
    );
  }

  const subtitle = formatDate(tournament.startsAt, `MMM D, YYYY [${i18n.t('at')}] HH:mm`);

  return (
    <Flex direction="column" align="baseline">
      <Text component="span" fw={700} c="white" mb="xs" truncate className="h5">
        {title}
      </Text>
      <Text component="span" size="sm">
        {subtitle}
      </Text>
    </Flex>
  );
}

interface TournamentActionProps {
  tournament: LobbyTournament;
  isAdmin?: boolean;
}

function TournamentAction({ tournament, isAdmin = false }: TournamentActionProps) {
  const text = getActionText();
  const showTournamentLink = tournament.state !== tournamentStates.upcoming || isAdmin;

  const openTournamentInfo = () => {
    NiceModal.show(ModalCodes.tournamentModal, { tournament });
  };

  return (
    <Box className="cb-tournament-top-actions">
      <Flex className="cb-tournament-actions">
        {showTournamentLink && (
          <Button
            component="a"
            color="cbSecondary"
            href={getTournamentUrl(tournament.id)}
            className="cb-tournament-main-action"
          >
            {text}
          </Button>
        )}
        <ActionIcon
          variant="transparent"
          onClick={openTournamentInfo}
          aria-label={i18n.t('Tournament details')}
          title={i18n.t('Tournament details')}
          className="cb-tournament-info-icon-btn cb-btn-outline-secondary"
        >
          <FontAwesomeIcon icon="info" />
        </ActionIcon>
      </Flex>
    </Box>
  );
}

const showStartsAt = (state?: string) =>
  [
    tournamentStates.active,
    tournamentStates.waitingParticipants,
    tournamentStates.upcoming,
  ].includes(state as string);

interface TournamentListItemProps {
  tournament: LobbyTournament;
  isAdmin?: boolean;
}

function TournamentListItem({ tournament, isAdmin = false }: TournamentListItemProps) {
  const title = localizeTournamentName(tournament.name, tournament.grade);
  const finishedAt = formatTournamentDate(
    tournament.finishedAt || tournament.lastRoundEndedAt || tournament.startsAt,
    tournament.grade,
  );

  return (
    <Paper
      withBorder
      radius="md"
      my="sm"
      mr="sm"
      className="cb-subtle-background cb-tournament-card"
    >
      <Flex direction="column" p="md" align="baseline" className="cb-tournament-card-body">
        <Flex align="center" className="cb-tournament-title-wrap">
          <Box visibleFrom="md" mr="sm" mb="md">
            {getIconForGrade(tournament.grade ?? '')}
          </Box>
          <TournamentTitle tournament={tournament} />
        </Flex>
        <Box className="cb-separator" mb="sm" />
        <Flex w="100%" justify="space-between" className="cb-tournament-meta-row">
          <Flex direction="column" align="baseline" className="cb-tournament-meta">
            {tournament.grade !== grades.open && (
              <Flex
                component="span"
                display="inline-flex"
                gap="xs"
                mt="sm"
                c="white"
                title={title}
                style={{ whiteSpace: 'nowrap' }}
              >
                <span className="cb-tournament-points-value">
                  {getRankingPoints(tournament.grade ?? '')[0]}
                </span>
                <span>{i18n.t('Ranking Points')}</span>
              </Flex>
            )}
            <Flex component="span" wrap="wrap">
              {tournament.state !== 'upcoming' && (
                <Flex
                  component="span"
                  display="inline-flex"
                  gap="sm"
                  mr="sm"
                  mt="sm"
                  c="white"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <FontAwesomeIcon
                    icon="flag-checkered"
                    className="text-warning"
                    style={iconSize}
                  />
                  {tournament.state ? i18n.t(mapTournamentTitleByState[tournament.state]) : null}
                </Flex>
              )}
              {tournamentStates.canceled !== tournament.state &&
                tournament.state !== 'upcoming' && (
                  <Flex
                    component="span"
                    display="inline-flex"
                    gap="sm"
                    mt="sm"
                    c="white"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <FontAwesomeIcon icon="user" className="text-warning" style={iconSize} />
                    {tournament.playersCount}
                  </Flex>
                )}
            </Flex>
            {showStartsAt(tournament.state) && (
              <>
                {dayjs(tournament.startsAt).diff(dayjs(), 'hours') <= 24 && (
                  <Flex
                    component="span"
                    display="inline-flex"
                    gap="sm"
                    mt="sm"
                    style={{ whiteSpace: 'nowrap' }}
                    className="cb-tournament-starts-in"
                  >
                    <FontAwesomeIcon icon="clock" className="cb-tournament-gold" style={iconSize} />
                    <TournamentTimer label={i18n.t('starts in')} date={tournament.startsAt}>
                      {formatTournamentDate(tournament.startsAt, tournament.grade)}
                    </TournamentTimer>
                  </Flex>
                )}
              </>
            )}
            {tournament.state === tournamentStates.finished && finishedAt && (
              <Flex
                component="span"
                display="inline-flex"
                visibleFrom="sm"
                gap="sm"
                pr="sm"
                mt="sm"
                c="white"
                style={{ whiteSpace: 'nowrap' }}
              >
                <FontAwesomeIcon icon="clock" className="text-warning" style={iconSize} />
                {finishedAt}
              </Flex>
            )}
          </Flex>
          <TournamentAction tournament={tournament} isAdmin={isAdmin} />
        </Flex>
      </Flex>
    </Paper>
  );
}

export default TournamentListItem;
