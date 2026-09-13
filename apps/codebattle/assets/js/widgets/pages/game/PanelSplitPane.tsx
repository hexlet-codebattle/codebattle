import React, { type ReactElement } from 'react';

import { Box } from '@mantine/core';
import Split from 'react-split';

import useWindowDimensions from '@/utils/useWindowDimensions';

interface PanelsSplitPaneProps {
  children: ReactElement[];
  viewMode: string;
}

function PanelsSplitPane({ children, viewMode }: PanelsSplitPaneProps) {
  const dimensions = useWindowDimensions();

  if (viewMode !== 'duel' || dimensions.width < 992) return children;

  return (
    <Split
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxHeight: 'calc(100vh - 77px)',
      }}
      sizes={[35, 60]}
      direction="vertical"
      gutterSize={5}
      gutterAlign="center"
      cursor="row-resize"
    >
      <Box display="flex" w="100%" style={{ minHeight: 100 }}>
        {children[0]}
      </Box>
      <Box display="flex" w="100%" className="cb-overflow-y-hidden" style={{ minHeight: 200 }}>
        {children[1]}
      </Box>
    </Split>
  );
}

export default PanelsSplitPane;
