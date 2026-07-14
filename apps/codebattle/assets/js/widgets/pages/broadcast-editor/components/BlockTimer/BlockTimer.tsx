import React from 'react';

import BlockBase from '../BlockBase/BlockBase';
import { type BlockCommonProps } from '../../types';
import './BlockTimer.css';

interface BlockTimerProps extends BlockCommonProps {
  time?: string;
}

function BlockTimer({ time, ...props }: BlockTimerProps) {
  return (
    <BlockBase {...props}>
      <div
        className="block-timer"
        style={{
          fontSize: '20px',
          fontWeight: '600',
          textAlign: 'center',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {time}
      </div>
    </BlockBase>
  );
}

export default BlockTimer;
