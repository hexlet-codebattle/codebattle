import React, {
  useCallback,
} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import i18next from 'i18next';

import ModalCodes from '../../config/modalCodes';
import TournamentStatusCodes from '../../config/tournament';

import TournamentInfo from './TournamentInfo';

const EventCalendarPanel = ({ tournaments }) => {
  const handleOpenInstruction = useCallback(description => {
    NiceModal.show(ModalCodes.tournamentDescriptionModal, { description });
  }, []);

  return (
    <div className="d-flex flex-column w-100">
      <div className="d-flex justify-content-center justify-content-lg-start border-bottom pb-2 px-3">
        <span className="font-weight-bold">{i18next.t('Event stages')}</span>
      </div>
      <div className="d-flex flex-column w-100">
        <TournamentInfo
          id={tournaments[0]?.id}
          type={
            tournaments[0]?.state
            || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 1 })}
          data="18.05"
          time="12:00-12:30 (UTC+3)"
          handleOpenInstruction={() => handleOpenInstruction(tournaments[0]?.description)}
        />
        <TournamentInfo
          id={tournaments[1]?.id}
          type={
            tournaments[1]?.state
            || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 1 })}
          nameClassName="cb-text-transparent"
          data="25.05"
          time="12:00-12:30 (UTC+3)"
          handleOpenInstruction={() => handleOpenInstruction(tournaments[1]?.description)}
        />
        <TournamentInfo
          id={tournaments[2]?.id}
          type={
            tournaments[2]?.state
            || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 1 })}
          nameClassName="cb-text-transparent"
          data="01.06"
          time="12:00-12:30 (UTC+3)"
          handleOpenInstruction={() => handleOpenInstruction(tournaments[2]?.description)}
        />
        <TournamentInfo
          id={tournaments[3]?.id}
          type={
            tournaments[3]?.state
            || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 2 })}
          data="08.06"
          time="12:10-14:00 (UTC+3)"
          handleOpenInstruction={() => handleOpenInstruction(tournaments[3]?.description)}
        />
        <TournamentInfo
          id={tournaments[4]?.id}
          type={
            tournaments[4]?.state
            || TournamentStatusCodes.waitingParticipants
          }
          name={i18next.t('Stage %{name}', { name: 3 })}
          data="27.06"
          time=""
          handleOpenInstruction={() => handleOpenInstruction(tournaments[4]?.description)}
        />
      </div>
    </div>
  );
};

export default EventCalendarPanel;
