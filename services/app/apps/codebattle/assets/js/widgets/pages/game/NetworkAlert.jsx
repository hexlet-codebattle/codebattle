import React, { useContext, memo } from 'react';
import RoomContext from '../../components/RoomContext';
import { isDisconnectedWithMessageSelector } from '../../machines/selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

function NetworkAlert() {
  const { mainService } = useContext(RoomContext);
  const isDisconnectedWithMessage = useMachineStateSelector(mainService, isDisconnectedWithMessageSelector);

  if (isDisconnectedWithMessage) {
    return (
      <div className="mx-1 text-center">
        <div className="bg-warning">
          Server is temporarily unavailable ¯\_(ツ)_/¯ :prod_is_down:
        </div>
      </div>
    );
  }

  return (<></>);
}

export default memo(NetworkAlert);
