import { useInterpret } from '@xstate/react';
import { useDispatch } from 'react-redux';

import speedModes from '../config/speedModes';
import SubscriptionTypeCodes from '../config/subscriptionTypes';
import { actions } from '../slices';

/**
 *
 * @return {{
 *  mainService: import('xstate').InterpreterFrom<import('xstate').StateMachine>,
 *  taskService: import('xstate').InterpreterFrom<import('xstate').StateMachine>
 * }}
 *
 */
const useGameRoomMachine = ({
  setTaskModalShowing,
  setResultModalShowing,
  setPremiumRestrictionModalShowing,
  subscriptionType = SubscriptionTypeCodes.free,
  mainMachine,
  taskMachine,
}) => {
  const dispatch = useDispatch();

  const mainService = useInterpret(mainMachine, {
    devTools: true,
    context: {
      errorMessage: null,
      holding: 'none',
      speedMode: speedModes.normal,
      subscriptionType,
    },
    actions: {
      showGameResultModal: () => {
        setResultModalShowing(true);
      },
      showPremiumSubscribeRequestModal: () => {
        setPremiumRestrictionModalShowing(true);
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
        dispatch(actions.setValidationStatuses({
          solution: [true],
          assertsExamples: [true],
          argumentsGenerator: [true],
        }));
      },
      onFailure: (_ctx, event) => {
        dispatch(actions.setValidationStatuses({
          solution: [false, event.message],
          assertsExamples: [false, event.message],
        }));
      },
      onError: (_ctx, event) => {
        dispatch(actions.setValidationStatuses({
          solution: [false, event.message],
          argumentsGenerator: [false, event.message],
        }));
      },
    },
  });

  return { mainService, taskService };
};

export default useGameRoomMachine;
