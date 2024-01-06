import { useEffect } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';

import TaskConfigurationModal from '@/pages/builder/TaskConfigurationModal';
import TaskParamsModal from '@/pages/builder/TaskParamsModal';
import AnimationModal from '@/pages/game/AnimationModal';
import PremiumRestrictionModal from '@/pages/game/PremiumRestrictionModal';
import TaskDescriptionModal from '@/pages/game/TaskDescriptionModal';
import TournamentStatisticsModal from '@/pages/game/TournamentStatisticsModal';

import ModalCodes from '../config/modalCodes';

const useGameRoomModals = machines => {
  useEffect(() => {
    NiceModal.register(ModalCodes.gameResultModal, AnimationModal);
    NiceModal.register(ModalCodes.premiumRestrictionModal, PremiumRestrictionModal);
    NiceModal.register(
      ModalCodes.taskParamsModal,
      TaskParamsModal,
      { taskService: machines.taskService },
    );
    NiceModal.register(ModalCodes.taskConfigurationModal, TaskConfigurationModal);
    NiceModal.register(ModalCodes.taskDescriptionModal, TaskDescriptionModal);
    NiceModal.register(ModalCodes.tournamentStatisticsModal, TournamentStatisticsModal);

    const unregisterModals = () => {
      unregister(ModalCodes.gameResultModal);
      unregister(ModalCodes.premiumRestrictionModal);
      unregister(ModalCodes.taskParamsModal);
      unregister(ModalCodes.taskConfigurationModal);
      unregister(ModalCodes.taskDescriptionModal);
      unregister(ModalCodes.tournamentStatisticsModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useGameRoomModals;
