import React, { useEffect } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';
import cn from 'classnames';
import upperCase from 'lodash/upperCase';
import { useSelector } from 'react-redux';

import i18n from '../../../i18n';
import ModalCodes from '../../config/modalCodes';
import {
  currentUserSelector,
  participantDataSelector,
  eventSelector,
} from '../../selectors';

import EventStageConfirmationModal from './EventStageConfirmationModal';
import NotPassedIcon from './NotPassedIcon';
import PassedIcon from './PassedIcon';

function ParticipantDashboard() {
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
            <h1 className="text-white text-capitalize cb-custom-event-title">
              {upperCase(i18n.t('Participant Dashboard'))}
            </h1>
            <div className="text-white">
              {i18n.t('Loading participant data...')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid position-relative">
      <div className="cup cup-aside" />
      <div className="d-flex flex-column">
        <div className="row my-5">
          <div className="col-12 col-lg-9 col-md-8 col-sm-12">
            <h1 className="text-white cb-custom-event-title">
              {upperCase(i18n.t('Participant Dashboard'))}
            </h1>
          </div>
          <div className="col-12 col-lg-3 col-md-4 col-sm-12">
            <div className="user-info d-flex flex-column align-items-center w-100">
              <div className="d-flex text-white justify-content-between cb-custom-event-profile my-1 mx-1 w-100">
                {i18n.t('Clan')}
                <span
                  title={user.clan}
                  className="cb-custom-event-profile-data ms-2"
                >
                  {user.clan}
                </span>
              </div>
              <div className="d-flex text-white justify-content-between cb-custom-event-profile my-1 mx-1 w-100">
                {i18n.t('Category')}
                <span className="cb-custom-event-profile-data ms-2">
                  {user.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="row my-3">
          <div className="col-12 cb-custom-event-stage-header cb-custom-event-stage-section">
            <div className="d-flex cb-custom-event-staget-header text-white w-100">
              <div
                style={{ width: '20%' }}
                className="d-flex justify-content-center align-items-center py-3"
              />
              <div className="d-flex justify-content-center align-items-center py-3 cb-custom-event-table-action-button" />
              <div
                style={{ minWidth: '15%', maxWidth: '60%' }}
                className="d-none d-lg-flex d-md-flex justify-content-center align-items-center py-3"
              >
                {i18n.t('Place in total')}
              </div>
              <div
                style={{ minWidth: '15%' }}
                className="d-none d-lg-flex d-md-flex justify-content-center align-items-center py-3"
              >
                {i18n.t('Place in category')}
              </div>
              <div
                style={{ minWidth: '15%' }}
                className="d-none d-lg-flex d-md-flex justify-content-center align-items-center py-3"
              >
                {i18n.t('Score/Total')}
              </div>
              <div
                style={{ minWidth: '15%' }}
                className="d-none d-lg-flex justify-content-center align-items-center py-3"
              >
                {i18n.t('Time spent')}
              </div>
            </div>
          </div>
          {participantData.stages.map((stage) => (
            <div
              key={stage.slug}
              className="col-12 cb-custom-event-stage-section"
            >
              <div className="text-white">
                <div className="d-flex flex-column flex-md-row py-3">
                  <div style={{ width: '20%' }} className="d-flex">
                    <div className="me-3" style={{ minWidth: '200px' }}>
                      <div>{stage.name}</div>
                      {stage.dates && <div>{stage.dates}</div>}
                    </div>
                  </div>
                  <div className="d-flex justify-content-center cb-custom-event-table-action-button">
                    {stage.isStageAvailableForUser
                      && stage.type === 'tournament' && (
                        <div className="action-button">
                          {stage.userStatus === 'started'
                          && stage.tournamentId ? (
                            <a
                              type="button"
                              className="btn btn-success rounded-pill px-4"
                              href={`/tournaments/${stage.tournamentId}`}
                            >
                              {i18n.t(stage.actionButtonText)}
                            </a>
                          ) : (
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
                          )}
                        </div>
                      )}
                    {stage.isStageAvailableForUser
                      && stage.type === 'entrance'
                      && stage.isUserPassedStage && (
                        <div className="d-flex align-items-center justify-content-center">
                          <PassedIcon />
                          <span className="px-1">{i18n.t('Passed')}</span>
                        </div>
                      )}
                    {stage.isStageAvailableForUser
                      && stage.type === 'entrance'
                      && !stage.isUserPassedStage && (
                        <div className="d-flex align-items-center justify-content-center">
                          <NotPassedIcon />
                          <span className="px-1">{i18n.t('Not passed')}</span>
                        </div>
                      )}
                  </div>
                  {stage.type === 'tournament' && (
                    <>
                      <div
                        style={{ minWidth: '15%' }}
                        className={cn(
                          'd-flex d-sm-flex',
                          'justify-content-center align-items-center text-center me-5',
                        )}
                      >
                        <div className="d-block d-lg-none d-md-none me-2 font-weight-bold">
                          {i18n.t('Place in total')}
                          :
                        </div>
                        {stage.placeInTotalRank}
                      </div>
                      <div
                        style={{ minWidth: '15%' }}
                        className={cn(
                          'd-flex d-sm-flex',
                          'justify-content-center align-items-center text-center me-5',
                        )}
                      >
                        <div className="d-block d-lg-none d-md-none me-2 font-weight-bold">
                          {i18n.t('Place in category')}
                          :
                        </div>
                        {stage.placeInCategoryRank}
                      </div>
                      <div
                        style={{ minWidth: '15%' }}
                        className={cn(
                          'd-flex d-sm-flex',
                          'justify-content-center align-items-center text-center me-5',
                        )}
                      >
                        <div className="d-block d-lg-none d-md-none me-2 font-weight-bold">
                          {i18n.t('Score/Total')}
                          :
                        </div>
                        {stage.winsCount}
                        /
                        {stage.gamesCount}
                      </div>
                      <div
                        style={{ minWidth: '15%' }}
                        className={cn(
                          'd-flex d-sm-flex',
                          'justify-content-center align-items-center text-center me-5',
                        )}
                      >
                        <div className="d-block d-lg-none me-2 font-weight-bold">
                          {i18n.t('Time spent')}
                          :
                        </div>
                        {stage.timeSpent}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ParticipantDashboard;
