import NiceModal from '@ebay/nice-modal-react';
import { useInterpret } from '@xstate/react';
import { useDispatch, useSelector } from 'react-redux';

import { changePresenceState } from '@/middlewares/Main';

import ModalCodes from '../config/modalCodes';
import speedModes from '../config/speedModes';
import * as selectors from '../selectors';

// mainMachine/taskMachine are xstate v4 machines; typed loosely per migration conventions.
const useGameRoomMachine = ({
  mainMachine,
  taskMachine,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mainMachine: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taskMachine: any;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch(changePresenceState('watching') as any);
      },
      handleOpenActiveGame: () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch(changePresenceState('playing') as any);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      showGameResultModal: (_ctx: any, { payload }: any) => {
        if (!payload.award) {
          NiceModal.show(ModalCodes.gameResultModal);
        }
      },
      showPremiumSubscribeRequestModal: () => {
        NiceModal.show(ModalCodes.premiumRestrictionModal);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blockGameRoomAfterCheck: (_ctx: any, { payload }: any) => {
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
