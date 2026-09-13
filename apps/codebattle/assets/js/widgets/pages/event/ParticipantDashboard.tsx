import React, { useEffect } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';
import upperCase from 'lodash/upperCase';
import { useSelector } from 'react-redux';

import { Box, Button, Flex, Grid, Text, Title } from '@mantine/core';

import NextStageGroupTournamentModal from '@/pages/game/NextStageGroupTournamentModal';

import i18n from '../../../i18n';
import ModalCodes from '../../config/modalCodes';
import { currentUserSelector, participantDataSelector, eventSelector } from '../../selectors';

import EventStageConfirmationModal from './EventStageConfirmationModal';
import NotPassedIcon from './NotPassedIcon';
import PassedIcon from './PassedIcon';

interface ParticipantUser {
  clan?: string;
  category?: string;
}

function ParticipantDashboard() {
  useEffect(() => {
    NiceModal.register(ModalCodes.eventStageModal, EventStageConfirmationModal);
    NiceModal.register(ModalCodes.nextStageGroupTournamentModal, NextStageGroupTournamentModal);

    const unregisterModals = () => {
      unregister(ModalCodes.eventStageModal);
      unregister(ModalCodes.nextStageGroupTournamentModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = useSelector(currentUserSelector) as ParticipantUser;
  const participantData = useSelector(participantDataSelector);
  const event = useSelector(eventSelector);

  const pendingActiveStage = participantData?.stages?.find(
    (stage) =>
      stage.status === 'active' &&
      stage.userStatus !== 'completed' &&
      (stage.groupTournamentId || stage.tournamentId),
  );

  const pendingGroupTournamentId = pendingActiveStage?.groupTournamentId;
  const pendingTournamentId =
    !pendingGroupTournamentId && pendingActiveStage?.tournamentId
      ? pendingActiveStage.tournamentId
      : null;

  useEffect(() => {
    if (pendingGroupTournamentId) {
      NiceModal.show(ModalCodes.nextStageGroupTournamentModal, {
        groupTournamentId: pendingGroupTournamentId,
      });
    }
  }, [pendingGroupTournamentId]);

  if (!participantData || !event) {
    return (
      <Box w="100%" px="md">
        <Box mb="lg">
          <Title order={1} className="cb-custom-event-title" c="white" tt="capitalize">
            {upperCase(i18n.t('Participant Dashboard'))}
          </Title>
          <Text c="white">{i18n.t('Loading participant data...')}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box w="100%" px="md" pos="relative" style={{ overflow: 'hidden' }}>
      <div className="cup cup-aside" />
      <Flex direction="column" className="cb-custom-event-content" mx="auto" w="100%">
        <Grid my="xl">
          <Grid.Col span={{ base: 12, sm: 12, md: 8, lg: 9 }}>
            <Title order={1} c="white" className="cb-custom-event-title">
              {upperCase(i18n.t('Participant Dashboard'))}
            </Title>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 12, md: 4, lg: 3 }}>
            <Flex direction="column" align="center" w="100%" className="user-info">
              <Flex
                justify="space-between"
                c="white"
                className="cb-custom-event-profile"
                my="xs"
                mx="xs"
                w="100%"
              >
                {i18n.t('Clan')}
                <Box className="cb-custom-event-profile-data" ml="xs" title={user.clan}>
                  {user.clan}
                </Box>
              </Flex>
              <Flex
                justify="space-between"
                c="white"
                className="cb-custom-event-profile"
                my="xs"
                mx="xs"
                w="100%"
              >
                {i18n.t('Category')}
                <Box className="cb-custom-event-profile-data" ml="xs">
                  {user.category}
                </Box>
              </Flex>
            </Flex>
          </Grid.Col>
        </Grid>

        <Grid my="md">
          <Grid.Col
            span={12}
            className="cb-custom-event-stage-header cb-custom-event-stage-section"
            display={{ base: 'none', xl: 'block' }}
          >
            <Box
              className="cb-custom-event-stage-grid cb-custom-event-stage-grid-header"
              c="white"
              w="100%"
              py="sm"
            >
              <Box />
              <Box />
              <Flex justify="center" align="center">
                {i18n.t('Place in total')}
              </Flex>
              <Flex justify="center" align="center">
                {i18n.t('Place in category')}
              </Flex>
              <Flex justify="center" align="center">
                {i18n.t('Score/Total')}
              </Flex>
              <Flex justify="center" align="center">
                {i18n.t('Time spent')}
              </Flex>
            </Box>
          </Grid.Col>
          {participantData.stages.map((stage) => (
            <Grid.Col key={stage.slug} span={12} className="cb-custom-event-stage-section">
              <Box c="white">
                <Box className="cb-custom-event-stage-grid" py="sm">
                  <Flex>
                    <Box className="cb-custom-event-stage-name">
                      <Box>{stage.name}</Box>
                      {stage.dates && <Box>{stage.dates}</Box>}
                    </Box>
                  </Flex>
                  <Flex justify="center" className="cb-custom-event-stage-action">
                    {stage.isStageAvailableForUser && stage.type === 'tournament' && (
                      <div className="action-button">
                        {stage.userStatus === 'completed' ? (
                          <Button color="cbSecondary" radius="xl" px="lg" disabled>
                            {i18n.t(stage.actionButtonText)}
                          </Button>
                        ) : stage.groupTournamentId ? (
                          <Button
                            component="a"
                            radius="xl"
                            px="lg"
                            color="cbSuccess"
                            href={`/group_tournaments/${stage.groupTournamentId}`}
                          >
                            {i18n.t(stage.actionButtonText)}
                          </Button>
                        ) : stage.userStatus === 'started' && stage.tournamentId ? (
                          <Button
                            component="a"
                            radius="xl"
                            px="lg"
                            color="cbSuccess"
                            href={`/tournaments/${stage.tournamentId}?auto_join=1`}
                          >
                            {i18n.t(stage.actionButtonText)}
                          </Button>
                        ) : (
                          <Button
                            color="yellow"
                            radius="xl"
                            px="lg"
                            onClick={() => {
                              NiceModal.show(ModalCodes.eventStageModal, {
                                url: `/e/${event.slug}/stage?stage_slug=${stage.slug}`,
                                titleModal: i18n.t('Stage confirmation'),
                                bodyText: stage.confirmationText,
                                buttonText: stage.actionButtonText,
                              });
                            }}
                          >
                            {i18n.t(stage.actionButtonText)}
                          </Button>
                        )}
                      </div>
                    )}
                    {stage.isStageAvailableForUser &&
                      stage.type === 'entrance' &&
                      stage.isUserPassedStage && (
                        <Flex align="center" justify="center">
                          <PassedIcon />
                          <Box px="xs">{i18n.t('Passed')}</Box>
                        </Flex>
                      )}
                    {stage.isStageAvailableForUser &&
                      stage.type === 'entrance' &&
                      !stage.isUserPassedStage && (
                        <Flex align="center" justify="center">
                          <NotPassedIcon />
                          <Box px="xs">{i18n.t('Not passed')}</Box>
                        </Flex>
                      )}
                  </Flex>
                  {stage.type === 'tournament' && (
                    <>
                      <Flex
                        justify="center"
                        align="center"
                        ta="center"
                        className="cb-custom-event-stage-cell"
                      >
                        <Box display={{ base: 'block', xl: 'none' }} mr="xs" fw={700}>
                          {i18n.t('Place in total')}:
                        </Box>
                        {stage.placeInTotalRank}
                      </Flex>
                      <Flex
                        justify="center"
                        align="center"
                        ta="center"
                        className="cb-custom-event-stage-cell"
                      >
                        <Box display={{ base: 'block', xl: 'none' }} mr="xs" fw={700}>
                          {i18n.t('Place in category')}:
                        </Box>
                        {stage.placeInCategoryRank}
                      </Flex>
                      <Flex
                        justify="center"
                        align="center"
                        ta="center"
                        className="cb-custom-event-stage-cell"
                      >
                        <Box display={{ base: 'block', xl: 'none' }} mr="xs" fw={700}>
                          {i18n.t('Score/Total')}:
                        </Box>
                        <Flex direction="column" align="center">
                          <span>
                            {stage.winsCount}/{stage.gamesCount}
                          </span>
                          <span>
                            {stage.aiScore}
                            {stage.maxScore != null ? `/${stage.maxScore}` : ''}
                          </span>
                        </Flex>
                      </Flex>
                      <Flex
                        justify="center"
                        align="center"
                        ta="center"
                        className="cb-custom-event-stage-cell"
                      >
                        <Box display={{ base: 'block', xl: 'none' }} mr="xs" fw={700}>
                          {i18n.t('Time spent')}:
                        </Box>
                        <Flex direction="column" align="center">
                          <span>{stage.tournamentTimeSpent}</span>
                          <span>{stage.groupTournamentTimeSpent}</span>
                        </Flex>
                      </Flex>
                    </>
                  )}
                </Box>
              </Box>
            </Grid.Col>
          ))}
        </Grid>
      </Flex>
    </Box>
  );
}

export default ParticipantDashboard;
