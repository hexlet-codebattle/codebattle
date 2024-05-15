import NiceModal from '@ebay/nice-modal-react';
import { useInterpret } from '@xstate/react';
import { useDispatch, useSelector } from 'react-redux';

import { changePresenceState } from '@/middlewares/Main';

import ModalCodes from '../config/modalCodes';
import speedModes from '../config/speedModes';
import { modalModes, modalActions } from '../pages/builder/TaskParamsModal';
import * as selectors from '../selectors';
import { actions } from '../slices';

/**
 *
 * @function
 * @return {{
 *  mainService: import('xstate').InterpreterFrom<import('xstate').StateMachine>,
 *  taskService: import('xstate').InterpreterFrom<import('xstate').StateMachine>,
 *  waitingRoomService: import('xstate').InterpreterFrom<import('xstate').StateMachine>
 * }}
 *
 */
const useGameRoomMachine = ({
  mainMachine,
  taskMachine,
  waitingRoomMachine,
}) => {
  const dispatch = useDispatch();

  const subscriptionType = useSelector(selectors.subscriptionTypeSelector);

  const mainService = useInterpret(mainMachine, {
    devTools: true,
    context: {
      errorMessage: null,
      holding: 'none',
      speedMode: speedModes.normal,
      subscriptionType,
    },
    actions: {
      handleOpenHistory: () => {
        dispatch(changePresenceState('watching'));
      },
      handleOpenActiveGame: () => {
        dispatch(changePresenceState('playing'));
      },
      showGameResultModal: (_ctx, { payload }) => {
        if (!payload.award) {
          NiceModal.show(ModalCodes.gameResultModal);
        }
      },
      showPremiumSubscribeRequestModal: () => {
        NiceModal.show(ModalCodes.premiumRestrictionModal);
      },
      blockGameRoomAfterCheck: (_ctx, { payload }) => {
        if (payload.award) {
          NiceModal.show(ModalCodes.awardModal);
        }
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
        NiceModal.show(ModalCodes.taskParamsModal, { action: modalActions.save, mode: modalModes.preview });
      },
      closeTaskSaveConfirmation: () => {
        NiceModal.hide(ModalCodes.taskParamsModal);
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

  const waitingRoomService = useInterpret(waitingRoomMachine, {
    devTools: true,
    actions: {},
  });

  return { mainService, taskService, waitingRoomService };
};

export default useGameRoomMachine;
