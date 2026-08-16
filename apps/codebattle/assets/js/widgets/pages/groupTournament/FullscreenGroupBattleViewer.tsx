import React from 'react';
import { Box, Button, Flex, Text } from '@mantine/core';
import i18n from '../../../i18n';
import RunIframe from './RunIframe';
import { type Run } from './types';

interface FullscreenGroupBattleViewerProps {
  viewerFullscreen: boolean;
  selectedRun?: Run | null;
  setViewerFullscreen: (value: boolean) => void;
}

function FullscreenGroupBattleViewer({
  viewerFullscreen,
  selectedRun,
  setViewerFullscreen,
}: FullscreenGroupBattleViewerProps) {
  if (!(viewerFullscreen && selectedRun?.result?.viewerHtml)) {
    return <></>;
  }

  return (
    <Flex
      pos="fixed"
      direction="column"
      style={{
        inset: 0,
        zIndex: 2000,
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        padding: '16px',
      }}
    >
      <Flex justify="space-between" align="center" mb="md">
        <Text c="white">
          {i18n.t('Run Viewer Fullscreen')}
          {selectedRun ? ` • Run #${selectedRun.id}` : ''}
        </Text>
        <Button
          type="button"
          variant="default"
          radius="md"
          onClick={() => setViewerFullscreen && setViewerFullscreen(false)}
        >
          {i18n.t('Close Fullscreen')}
        </Button>
      </Flex>
      <Box style={{ flexGrow: 1 }}>
        <RunIframe
          title={`run-viewer-fullscreen-${selectedRun.id}`}
          srcDoc={selectedRun.result.viewerHtml}
          sandbox="allow-scripts"
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            backgroundColor: '#fff',
            borderRadius: '8px',
          }}
        />
      </Box>
    </Flex>
  );
}

export default FullscreenGroupBattleViewer;
