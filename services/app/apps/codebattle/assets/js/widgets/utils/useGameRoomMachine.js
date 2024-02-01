import NiceModal from '@ebay/nice-modal-react';
import { useInterpret } from '@xstate/react';
import { useDispatch, useSelector } from 'react-redux';

import ModalCodes from '../config/modalCodes';
import speedModes from '../config/speedModes';
import { modalModes, modalActions } from '../pages/builder/TaskParamsModal';
import * as selectors from '../selectors';
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
  mainMachine,
  taskMachine,
}) => {
  const dispatch = useDispatch();

  const award = useSelector(selectors.gameAwardSelector);
  const subscriptionType = useSelector(selectors.subscriptionTypeSelector);

  const mainService = useInterpret(mainMachine, {
    devTools: true,
    context: {
      errorMessage: null,
      holding: 'none',
      speedMode: speedModes.normal,
      subscriptionType,
      withAward: !!award,
    },
    actions: {
      showGameResultModal: ctx => {
        if (!ctx.withAward) {
          NiceModal.show(ModalCodes.gameResultModal);
        }
      },
      showPremiumSubscribeRequestModal: () => {
        NiceModal.show(ModalCodes.premiumRestrictionModal);
      },
      blockGameRoomAfterCheck: ctx => {
        if (ctx.withAward) {
          NiceModal.show(ModalCodes.awardModal);
          dispatch(actions.setVisible(false));
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

  return { mainService, taskService };
};

export default useGameRoomMachine;
