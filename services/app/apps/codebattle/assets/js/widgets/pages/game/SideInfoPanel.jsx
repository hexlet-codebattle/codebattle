import React from 'react';

import Output from './Output';
import OutputTab from './OutputTab';
import TaskAssignment from './TaskAssignment';

const SideInfoPanel = ({
  // timerProps,
  taskPanelProps,
  outputData,
}) => (
  <div
    className="d-flex flex-column col-12 col-xl-4 col-lg-6 p-1"
    style={{ height: 'calc(100vh - 92px)' }}
  >
    <div>
      <TaskAssignment {...taskPanelProps} />
    </div>
    <div
      className="card border-0 shadow-sm mt-1 cb-overflow-y-auto"
    >
      <div
        className="d-flex justify-content-around align-items-center w-100 p-2"
      >
        {/* <TimerContainer {...timerProps} /> */}
        <OutputTab sideOutput={outputData} large />
      </div>
      <div
        className="d-flex flex-column w-100 h-100 user-select-none cb-overflow-y-auto"
      >
        <Output hideContent={taskPanelProps.hideContent} sideOutput={outputData} />
      </div>
    </div>
  </div>
);

export default SideInfoPanel;
