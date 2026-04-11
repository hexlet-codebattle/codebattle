import { useEffect } from "react";

import NiceModal, { unregister } from "@ebay/nice-modal-react";

import AnimationModal from "@/pages/game/AnimationModal";
import PremiumRestrictionModal from "@/pages/game/PremiumRestrictionModal";
import TaskDescriptionModal from "@/pages/game/TaskDescriptionModal";
import TournamentAwardModal from "@/pages/game/TournamentAwardModal";
import TournamentStatisticsModal from "@/pages/game/TournamentStatisticsModal";

import ModalCodes from "../config/modalCodes";

const useGameRoomModals = () => {
  useEffect(() => {
    NiceModal.register(ModalCodes.gameResultModal, AnimationModal);
    NiceModal.register(ModalCodes.premiumRestrictionModal, PremiumRestrictionModal);
    NiceModal.register(ModalCodes.taskDescriptionModal, TaskDescriptionModal);
    NiceModal.register(ModalCodes.tournamentStatisticsModal, TournamentStatisticsModal);
    NiceModal.register(ModalCodes.awardModal, TournamentAwardModal);

    const unregisterModals = () => {
      unregister(ModalCodes.gameResultModal);
      unregister(ModalCodes.premiumRestrictionModal);
      unregister(ModalCodes.taskDescriptionModal);
      unregister(ModalCodes.tournamentStatisticsModal);
      unregister(ModalCodes.awardModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useGameRoomModals;
