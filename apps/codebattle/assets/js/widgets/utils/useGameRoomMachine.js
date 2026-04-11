import NiceModal from "@ebay/nice-modal-react";
import { useInterpret } from "@xstate/react";
import { useDispatch, useSelector } from "react-redux";

import { changePresenceState } from "@/middlewares/Main";

import ModalCodes from "../config/modalCodes";
import speedModes from "../config/speedModes";
import * as selectors from "../selectors";

/**
 *
 * @function
 * @return {{
 *  mainService: import('xstate').InterpreterFrom<import('xstate').StateMachine>,
 *  taskService: import('xstate').InterpreterFrom<import('xstate').StateMachine>,
 * }}
 *
 */
const useGameRoomMachine = ({ mainMachine, taskMachine }) => {
  const dispatch = useDispatch();

  const subscriptionType = useSelector(selectors.subscriptionTypeSelector);

  const mainService = useInterpret(mainMachine, {
    devTools: true,
    context: {
      errorMessage: null,
      holding: "none",
      speedMode: speedModes.normal,
      subscriptionType,
    },
    actions: {
      handleOpenHistory: () => {
        dispatch(changePresenceState("watching"));
      },
      handleOpenActiveGame: () => {
        dispatch(changePresenceState("playing"));
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
      openTesting: () => {},
      showTaskSaveConfirmation: () => {},
      closeTaskSaveConfirmation: () => {},
      onSuccess: () => {},
      onFailure: () => {},
      onError: () => {},
    },
  });

  return { mainService, taskService };
};

export default useGameRoomMachine;
