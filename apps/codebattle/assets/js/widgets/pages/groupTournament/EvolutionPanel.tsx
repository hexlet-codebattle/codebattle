import React from 'react';
import { Box, Button, Flex, Title } from '@mantine/core';
import i18n from '../../../i18n';
import RunItem from './RunItem';
import { buildVscodeFolderUrl, isOnBreak } from '../../utils/groupTournament';
import { type Run, type GroupTournament, type LeaderboardEntry } from './types';

interface EvolutionPanelProps {
  items?: Run[];
  tournamentStatus?: string;
  groupTournament?: GroupTournament | null;
  runId?: number | string;
  setRunId: (id: number | string) => void;
  repoUrl?: string;
  onAddSolution?: (() => void) | null;
  leaderboard?: LeaderboardEntry[];
  currentUserId?: number;
}

function EvolutionPanel({
  items,
  tournamentStatus,
  groupTournament,
  runId,
  setRunId,
  repoUrl,
  onAddSolution,
  leaderboard,
  currentUserId = 1,
}: EvolutionPanelProps) {
  const isFinished = tournamentStatus === 'finished';
  const isWaiting = tournamentStatus === 'waiting_participants';
  const externalUrl = !isFinished && !isWaiting ? repoUrl : null;
  const vscodeUrl =
    !isFinished && !isWaiting && !externalUrl
      ? buildVscodeFolderUrl(groupTournament?.localFolder)
      : null;
  const canAddSolutionInternal =
    !isFinished && !isWaiting && !externalUrl && !vscodeUrl && !!onAddSolution;
  const onBreak = isOnBreak(groupTournament);

  const addSolutionClasses = 'cb-evolution-panel-add-solution btn-yellow';

  return (
    <>
      <Flex align="center" justify="center" w="100%" className="cb-evolution-panel-header">
        <Title order={5} c="white" fw={700} mb={0}>
          {i18n.t('Execution History')}
        </Title>
      </Flex>
      <Box mt="lg" p="md" w="100%" className="cb-evolution-panel-main">
        <Box className="cb-evolution-panel-inner">
          {externalUrl && (
            <Button
              component="a"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={addSolutionClasses}
              w="100%"
              h="auto"
              radius="xl"
              mb="md"
            >
              {i18n.t('Add Solution +')}
            </Button>
          )}
          {vscodeUrl && (
            <Button
              component="a"
              href={vscodeUrl}
              className={addSolutionClasses}
              w="100%"
              h="auto"
              radius="xl"
              mb="md"
            >
              {i18n.t('Add Solution +')}
            </Button>
          )}
          {canAddSolutionInternal && (
            <Button
              type="button"
              onClick={onAddSolution}
              className={addSolutionClasses}
              w="100%"
              h="auto"
              radius="xl"
              mb="md"
            >
              {i18n.t('Add Solution +')}
            </Button>
          )}
          {items && items.length > 0 && (
            <Box mt="xs" fz="sm" className="cb-timeline">
              {items.map((item) => (
                <RunItem
                  key={item.id}
                  item={item}
                  items={items}
                  runId={runId}
                  setRunId={setRunId}
                  leaderboard={leaderboard}
                  currentUserId={currentUserId}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}

export default EvolutionPanel;
