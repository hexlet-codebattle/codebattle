import React from 'react';
import { Box, Flex, Loader, Text, Title } from '@mantine/core';
import RunIframe from './RunIframe';
import i18n from '../../../i18n';
import { type Run } from './types';

interface MainPanelRunViewerProps {
  run?: Run | null;
  hasViewer: boolean;
  isPendingRun: boolean;
  isLoadingResult?: boolean | null;
}

const halfWhite = 'rgba(255, 255, 255, 0.5)';

const MainPanelRunViewer = ({
  run,
  hasViewer,
  isPendingRun,
  isLoadingResult,
}: MainPanelRunViewerProps) => (
  <Box mt="lg" p="md" w="100%" className="cb-group-tournament-leaderboard-container">
    {!run ? (
      <Text c={halfWhite} p="sm">
        {i18n.t('Pick a run from the left panel to see its output.')}
      </Text>
    ) : hasViewer ? (
      <RunIframe
        title={`run-viewer-${run.id}`}
        srcDoc={run.result?.viewerHtml}
        sandbox="allow-scripts"
        style={{
          width: '100%',
          minHeight: 'inherit',
          border: 0,
          backgroundColor: '#1a1d2b',
          borderRadius: '16px',
        }}
      />
    ) : isPendingRun ? (
      <Flex align="center" justify="center" h="100%" c="white">
        <Box ta="center">
          <Loader color="yellow" size="lg" mb="md" />
          <Title order={5} mb="xs">
            {i18n.t('Running your solution…')}
          </Title>
          <Text c={halfWhite} size="sm">
            {i18n.t("We're executing your code in the runner. This may take a few seconds.")}
          </Text>
        </Box>
      </Flex>
    ) : isLoadingResult ? (
      <Flex align="center" justify="center" h="100%" c="white">
        <Box ta="center">
          <Loader color="cyan" size="lg" mb="md" />
          <Title order={5} mb="xs">
            {i18n.t('Loading run result…')}
          </Title>
          <Text c={halfWhite} size="sm">
            {i18n.t('Fetching the executed run output.')}
          </Text>
        </Box>
      </Flex>
    ) : (
      <Text c="white" p="sm">
        {i18n.t('No viewer HTML for this run.')}
      </Text>
    )}
  </Box>
);

export default MainPanelRunViewer;
