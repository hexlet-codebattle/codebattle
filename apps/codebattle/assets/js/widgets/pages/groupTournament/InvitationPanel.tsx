import React from 'react';
import { Anchor, Box, Button, Flex, Text, Title } from '@mantine/core';

import i18n from '../../../i18n';
import { type TournamentMeta, type Invite } from './types';

interface InvitationPanelProps {
  name?: string;
  meta?: TournamentMeta | null;
  repoUrl?: string;
  invite?: Invite | null;
  onStart: () => void;
}

function InvitationPanel({ name, meta, repoUrl, invite, onStart }: InvitationPanelProps) {
  const isAccepted = invite?.state === 'accepted';
  const m = meta || {};
  const tournamentDetailsUrl = m.tournamentDetailsUrl || repoUrl || null;
  const tournamentDetailsLabel = m.tournamentDetailsLabel || i18n.t('tournament');

  const taskInfoLabel = m.taskInfoLabel || i18n.t('Task is solved in External Plaform');
  const taskInfoIconUrl = m.taskInfoIconUrl || null;
  const taskDurationLabel = m.taskDurationLabel || i18n.t('30 minutes to solve');
  const taskDurationIconUrl = m.taskDurationIconUrl || null;
  const stepsTitle = m.stepsTitle || i18n.t('Before you begin:');
  const step1Label =
    m.step1Label || i18n.t('Join our External Platform organization to receive the task');
  const step1ButtonLabel = m.step1ButtonLabel || i18n.t('Accept invitation');
  const step2Label = m.step2Label || i18n.t('Once all steps are complete, you can start solving');
  const step2ButtonLabel = m.step2ButtonLabel || i18n.t('Go to task');

  const btnClass = 'btn-yellow';

  return (
    <Box w="100%" pos="relative" style={{ overflow: 'hidden', minHeight: '100vh' }}>
      <div className="cup cup-aside" />
      <Flex direction="column" mx="auto" w="100%" className="cb-custom-event-content">
        <Flex my="xl" wrap="wrap">
          <Flex justify="center" w="100%">
            <Text component="h1" c="white" ta="center" className="cb-custom-event-title">
              {(name || i18n.t('Group Tournament')).toUpperCase()}
            </Text>
          </Flex>
          <Flex justify="center" mt="md" w="100%">
            <Text c="white" ta="center" mb={0}>
              {i18n.t('Find tournament details at')}{' '}
              {tournamentDetailsUrl ? (
                <Anchor
                  c="white"
                  underline="always"
                  href={tournamentDetailsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tournamentDetailsLabel}
                </Anchor>
              ) : (
                tournamentDetailsLabel
              )}
            </Text>
          </Flex>
        </Flex>

        <Flex justify="center" my="lg" ta="center" wrap="wrap">
          <Flex direction="column" align="center" px="lg">
            {taskInfoIconUrl && (
              <img
                src={taskInfoIconUrl}
                alt=""
                style={{ width: 48, height: 48, objectFit: 'contain' }}
              />
            )}
            <Text size="sm" c="white" mt="xs" mb={0}>
              {taskInfoLabel}
            </Text>
          </Flex>
          <Flex direction="column" align="center" px="lg">
            {taskDurationIconUrl && (
              <img
                src={taskDurationIconUrl}
                alt=""
                style={{ width: 48, height: 48, objectFit: 'contain' }}
              />
            )}
            <Text size="sm" c="white" mt="xs" mb={0}>
              {taskDurationLabel}
            </Text>
          </Flex>
        </Flex>

        <Flex justify="center" my="md">
          <Box w={{ base: '100%', lg: '75%' }}>
            <Title order={3} c="white" ta="center" fw={700} mb="lg">
              {stepsTitle}
            </Title>

            <Flex
              justify="space-between"
              align="center"
              my="md"
              className="cb-custom-event-profile"
            >
              <Text c="white">{step1Label}</Text>
              {isAccepted ? (
                <Button type="button" className={btnClass} radius="xl" px="lg" h="auto" disabled>
                  {i18n.t('Accepted')}
                </Button>
              ) : invite?.inviteLink ? (
                <Button
                  component="a"
                  target="_blank"
                  href={invite.inviteLink}
                  className={btnClass}
                  radius="xl"
                  px="lg"
                  h="auto"
                  rel="noopener noreferrer"
                >
                  {step1ButtonLabel}
                </Button>
              ) : (
                <Button type="button" className={btnClass} radius="xl" px="lg" h="auto" disabled>
                  {step1ButtonLabel}
                </Button>
              )}
            </Flex>

            <Flex
              justify="space-between"
              align="center"
              my="md"
              className="cb-custom-event-profile"
            >
              <Text c="white">{step2Label}</Text>
              <Button
                type="button"
                className={btnClass}
                radius="xl"
                px="lg"
                h="auto"
                onClick={onStart}
                disabled={!isAccepted}
              >
                {step2ButtonLabel}
              </Button>
            </Flex>
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
}

export default InvitationPanel;
