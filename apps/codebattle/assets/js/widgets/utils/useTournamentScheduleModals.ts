import { useEffect } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';

import ModalCodes from '../config/modalCodes';
import { EventModal } from '../pages/schedule/EventModal';

const useTournamentScheduleModals = () => {
  useEffect(() => {
    NiceModal.register(ModalCodes.calendarEventModal, EventModal);

    const unregisterModals = () => {
      unregister(ModalCodes.calendarEventModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useTournamentScheduleModals;
