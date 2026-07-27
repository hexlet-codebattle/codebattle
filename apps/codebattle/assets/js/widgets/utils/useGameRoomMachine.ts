import NiceModal from '@ebay/nice-modal-react';
import { useActorRef } from '@xstate/react';
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

  const mainService = useActorRef(
    // xstate v5: per-instance implementations come from `.provide(...)`, and
    // seed context flows in via `input` (see the machine's `context({ input })`).
    mainMachine.provide({
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
        showGameResultModal: ({ event }: any) => {
          if (!event.payload.award) {
            NiceModal.show(ModalCodes.gameResultModal);
          }
        },
        showPremiumSubscribeRequestModal: () => {
          NiceModal.show(ModalCodes.premiumRestrictionModal);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blockGameRoomAfterCheck: ({ event }: any) => {
          if (event.payload.award) {
            NiceModal.show(ModalCodes.awardModal);
          }
        },
      },
    }),
    {
      input: {
        errorMessage: null,
        holding: 'none',
        speedMode: speedModes.normal,
        subscriptionType,
      },
    },
  );

  const taskService = useActorRef(
    taskMachine.provide({
      actions: {
        openTesting: () => {},
        showTaskSaveConfirmation: () => {},
        closeTaskSaveConfirmation: () => {},
        onSuccess: () => {},
        onFailure: () => {},
        onError: () => {},
      },
    }),
  );

  return { mainService, taskService };
};

export default useGameRoomMachine;
