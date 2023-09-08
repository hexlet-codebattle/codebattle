import React, { useContext, useCallback } from 'react';

import RoomContext from '../../components/RoomContext';

function BackToTaskBuilderButton() {
  const { mainService } = useContext(RoomContext);

  const handleOpenTaskBuilder = useCallback(
    () => mainService.send('OPEN_TASK_BUILDER'),
    [mainService],
  );

  return (
    <button
      className="btn btn-secondary btn-block rounded-lg"
      type="button"
      onClick={handleOpenTaskBuilder}
    >
      Back to task
    </button>
  );
}

export default BackToTaskBuilderButton;
