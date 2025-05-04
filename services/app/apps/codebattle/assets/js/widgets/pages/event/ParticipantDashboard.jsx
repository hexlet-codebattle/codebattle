import React, { useEffect } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';
import { useSelector } from 'react-redux';

import i18n from '../../../i18n';
import ModalCodes from '../../config/modalCodes';
import {
  currentUserSelector,
  participantDataSelector,
  eventSelector,
} from '../../selectors';

import EventStageConfirmationModal from './EventStageConfirmationModal';

const ParticipantDashboard = () => {
  useEffect(() => {
    NiceModal.register(ModalCodes.eventStageModal, EventStageConfirmationModal);

    const unregisterModals = () => {
      unregister(ModalCodes.eventStageModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = useSelector(currentUserSelector);
  const participantData = useSelector(participantDataSelector);
  const event = useSelector(eventSelector);

  if (!participantData || !event) {
    return (
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="display-4 text-white">
              {i18n.t('Participant Dashboard')}
            </h1>
            <div className="text-white">Loading participant data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="display-4 text-white">
            {i18n.t('Participant Dashboard')}
          </h1>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-12">
          <div className="card bg-dark text-white rounded-lg border-0">
            <div className="card-body d-flex justify-content-between align-items-center py-3">
              <div className="user-info d-flex align-items-center">
                <div>
                  <div>
                    {i18n.t('Clan')}
                    {' '}
                    <span className="text-warning ms-2">{user.clan}</span>
                  </div>
                  <div>
                    {i18n.t('Category')}
                    {' '}
                    <span className="text-warning ms-2">{user.category}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stages-container">
        {participantData.stages.map(stage => (
          <div key={stage.slug} className="row mb-2">
            <div className="col-12">
              <div className="card bg-dark text-white rounded-lg border-0">
                <div className="card-body d-flex justify-content-between align-items-center py-3">
                  <div className="stage-info d-flex">
                    <div className="me-3" style={{ minWidth: '200px' }}>
                      <div>{stage.name}</div>
                      {stage.dates && (
                        <div className="text-muted">{stage.dates}</div>
                      )}
                    </div>
                  </div>
                  {stage.isStageAvailableForUser
                    && stage.type === 'tournament' && (
                      <div className="action-button">
                        <button
                          type="button"
                          className="btn btn-warning rounded-pill px-4"
                          onClick={() => {
                            NiceModal.show(ModalCodes.eventStageModal, {
                              url: `/e/${event.slug}/stage?stage_slug=${stage.slug}`,
                              titleModal: i18n.t('Stage confirmation'),
                              bodyText: stage.confirmationText,
                              buttonText: stage.actionButtonText,
                            });
                          }}
                        >
                          {i18n.t(stage.actionButtonText)}
                        </button>
                      </div>
                    )}
                  {stage.isStageAvailableForUser
                    && stage.type === 'entrance' && (
                      <div className="action-button">
                        <p>Lol</p>
                      </div>
                    )}
                  {stage.type === 'tournament' && (
                    <div className="d-flex">
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t('Overall')}
                            :
                            {stage.placeInTotalRank}
                          </span>
                        </div>
                      </div>
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t('Category')}
                            :
                            {stage.placeInCategoryRank}
                          </span>
                        </div>
                      </div>
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t('Games count')}
                            :
                            {stage.gamesCount}
                          </span>
                        </div>
                      </div>
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t('Wins count')}
                            :
                            {stage.winsCount}
                          </span>
                        </div>
                      </div>
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t('Time spent')}
                            :
                            {stage.timeSpent}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantDashboard;
