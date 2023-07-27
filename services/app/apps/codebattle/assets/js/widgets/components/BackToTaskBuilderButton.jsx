import React, { useContext, useCallback } from 'react';
import RoomContext from '../containers/RoomContext';

const BackToTaskBuilderButton = () => {
  const { mainService } = useContext(RoomContext);

  const handleOpenTaskBuilder = useCallback(() => mainService.send('OPEN_TASK_BUILDER'), [mainService]);

  return (
    <button
      type="button"
      className="btn btn-secondary btn-block rounded-lg"
      onClick={handleOpenTaskBuilder}
    >
      Back to task
    </button>
  );
};

export default BackToTaskBuilderButton;
