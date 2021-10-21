import React from 'react';
import _ from 'lodash';
import Output from '../components/ExecutionOutput/Output';
import OutputTab from '../components/ExecutionOutput/OutputTab';

const StairwayOutputTab = ({ currentTaskId, outputs }) => {
const output = _.find(outputs, { taskId: currentTaskId }).result;
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
