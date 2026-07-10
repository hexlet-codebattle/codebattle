import { useSelector } from 'react-redux';

import { infoPanelExecutionOutputSelector } from '../selectors';

const usePlayerOutputForInfoPanel = (viewMode, roomMachineState) => {
  const outputData = useSelector(infoPanelExecutionOutputSelector(viewMode, roomMachineState));
  const canShowOutput = outputData && outputData.status;

  return {
    outputData,
    canShowOutput,
  };
};

export default usePlayerOutputForInfoPanel;
