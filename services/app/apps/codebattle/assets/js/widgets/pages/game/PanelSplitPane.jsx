import React from 'react';

import Split from 'react-split';

import { useWindowDimensions } from '@/utils/useWindowDimensions';

function PanelsSplitPane({ children, viewMode }) {
  const dimensions = useWindowDimensions();

  if (viewMode !== 'duel' || dimensions.width < 992) return children;

  return (
    <Split
      style={{ maxHeight: 'calc(100vh - 77px)' }}
      sizes={[35, 60]}
      className="d-flex flex-column w-100"
      direction="vertical"
      gutterSize={5}
      gutterAlign="center"
      cursor="row-resize"
    >
      <div style={{ minHeight: 100 }} className="d-flex w-100">{children[0]}</div>
      <div style={{ minHeight: 200 }} className="d-flex w-100 cb-overflow-y-hidden">{children[1]}</div>
    </Split>
  );
}

export default PanelsSplitPane;
