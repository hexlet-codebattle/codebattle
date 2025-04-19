import React from 'react';

import { useSelector } from 'react-redux';

import i18n from '../../../i18n';
import { currentUserSelector, participantDataSelector, eventSelector } from '../../selectors';

const ParticipantDashboard = () => {
  const user = useSelector(currentUserSelector);
  const participantData = useSelector(participantDataSelector);
  const event = useSelector(eventSelector);

  if (!participantData || !event) {
    return (
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="display-4 text-white">{i18n.t('Participant Dashboard')}</h1>
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
          <h1 className="display-4 text-white">{i18n.t('Participant Dashboard')}</h1>
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
                      <div>{i18n.t(stage.name)}</div>
                      {stage.date && <div className="text-muted">{stage.date}</div>}
                    </div>
                    <div className="status-indicator mx-3">
                      {stage.status === 'completed' && (
                        <div className="d-flex align-items-center">
                          <span className="bg-success rounded-circle d-inline-block me-2">✓</span>
                        </div>
                      )}
                      {stage.status === 'failed' && (
                        <div className="d-flex align-items-center">
                          <span className="bg-danger rounded-circle d-inline-block me-2">✗</span>
                          <span>{i18n.t('Failed')}</span>
                        </div>
                      )}
                      {stage.status === 'active' && (
                        <div className="d-flex align-items-center">
                          <span className="bg-primary rounded-circle d-inline-block me-2">!</span>
                          <span>{i18n.t('Active')}</span>
                        </div>
                      )}
                      {stage.status === 'pending' && (
                        <div className="d-flex align-items-center">
                          <span className="bg-secondary rounded-circle d-inline-block me-2">-</span>
                          <span>{i18n.t('Pending')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="d-flex">
                    <div className="standings-info text-center me-5">
                      <div className="d-flex align-items-center">
                        <span>
                          {i18n.t('Overall')}
                          :
                          {' '}
                          {stage.overall}
                        </span>
                      </div>
                    </div>
                    <div className="standings-info text-center me-5">
                      <div className="d-flex align-items-center">
                        <span>
                          {i18n.t('Category')}
                          :
                          {' '}
                          {stage.category}
                        </span>
                      </div>
                    </div>
                    {(stage.status === 'completed' || stage.status === 'active') && stage.actionButtonText && (
                      <div className="action-button">
                        <a href={stage.link} className="btn btn-warning rounded-pill px-4">{i18n.t(stage.actionButtonText)}</a>
                      </div>
                    )}
                  </div>
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
