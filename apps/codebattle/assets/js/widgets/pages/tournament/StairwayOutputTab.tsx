import React from 'react';

import { useSelector } from 'react-redux';

import { type RootState } from '@/slices/store';

import Output from '../game/Output';
import OutputTab from '../game/OutputTab';

interface StairwayOutputTabProps {
  playerId: number;
}

function StairwayOutputTab({ playerId }: StairwayOutputTabProps) {
  const output = useSelector(
    (state: RootState) =>
      state.executionOutput.results[playerId] as { status?: string } | undefined,
  );
  const isShowOutput = output && output.status;

  return (
    <>
      {isShowOutput && (
        <>
          <OutputTab sideOutput={output} side="left" />
          <Output sideOutput={output} />
        </>
      )}
    </>
  );
}

export default StairwayOutputTab;
