import React, { useContext, memo } from 'react';
import RoomContext from './RoomContext';
import { isDisconnectedWithMessageSelector } from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';

const NetworkAlert = memo(() => {
  const { mainService } = useContext(RoomContext);
  const isDisconnectedWithMessage = useMachineStateSelector(mainService, isDisconnectedWithMessageSelector);

  if (isDisconnectedWithMessage) {
    return <div className="col-12 bg-warning text-center">Server is temporarily unavailable ¯\_(ツ)_/¯ :prod_is_down:</div>;
  }

  return (<></>);
});

export default NetworkAlert;
