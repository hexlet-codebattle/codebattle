import { useSelector } from 'react-redux';

import { infoPanelExecutionOutputSelector } from '../selectors';

// roomMachineState is an xstate machine state snapshot forwarded to the
// selector, which has no exported type here — hence the localized any.
const usePlayerOutputForInfoPanel = (viewMode: string, roomMachineState: any) => {
  const outputData = useSelector(infoPanelExecutionOutputSelector(viewMode, roomMachineState)) as
    | { status?: string }
    | undefined;
  const canShowOutput = outputData && outputData.status;

  return {
    outputData,
    canShowOutput,
  };
};

export default usePlayerOutputForInfoPanel;
