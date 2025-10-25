import { useEffect } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';

import ModalCodes from '@/config/modalCodes';
import TournamentModal from '@/pages/lobby/TournamentModal';

const useLobbyModals = () => {
  useEffect(() => {
    NiceModal.register(ModalCodes.tournamentModal, TournamentModal);

    const unregisterModals = () => {
      unregister(ModalCodes.tournamentModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useLobbyModals;
