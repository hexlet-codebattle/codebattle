import React from 'react';
import { useSelector } from 'react-redux';

import Output from '../game/Output';
import OutputTab from '../game/OutputTab';

const StairwayOutputTab = ({ playerId }) => {
  const output = useSelector(state => state.executionOutput.results[playerId]);
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
};

export default StairwayOutputTab;
