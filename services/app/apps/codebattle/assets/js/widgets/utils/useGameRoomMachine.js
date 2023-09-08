import { useInterpret } from '@xstate/react';
import { useDispatch } from 'react-redux';

import { actions } from '../slices';

const useGameRoomMachine = ({
  mainMachine,
  setResultModalShowing,
  setTaskModalShowing,
  taskMachine,
}) => {
  const dispatch = useDispatch();

  const mainService = useInterpret(mainMachine, {
    devTools: true,
    actions: {
      showGameResultModal: () => {
        setResultModalShowing(true);
      },
    },
  });

  const taskService = useInterpret(taskMachine, {
    devTools: true,
    actions: {
      openTesting: () => {
        mainService.send('OPEN_TESTING');
      },
      showTaskSaveConfirmation: () => {
        setTaskModalShowing(true);
      },
      closeTaskSaveConfirmation: () => {
        setTaskModalShowing(false);
      },
      onSuccess: () => {
        dispatch(
          actions.setValidationStatuses({
            solution: [true],
            assertsExamples: [true],
            argumentsGenerator: [true],
          }),
        );
      },
      onFailure: (_ctx, event) => {
        dispatch(
          actions.setValidationStatuses({
            solution: [false, event.message],
            assertsExamples: [false, event.message],
          }),
        );
      },
      onError: (_ctx, event) => {
        dispatch(
          actions.setValidationStatuses({
            solution: [false, event.message],
            argumentsGenerator: [false, event.message],
          }),
        );
      },
    },
  });

  return { mainService, taskService };
};

export default useGameRoomMachine;
