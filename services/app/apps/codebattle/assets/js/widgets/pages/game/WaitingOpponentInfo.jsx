import React from 'react';
import i18n from 'i18next';
import CopyButton from '../../components/CopyButton';

function WaitingOpponentInfo({ gameUrl }) {
  return (
    <div className="jumbotron container text-center bg-white shadow-sm">
      <div className="col-xl-8 col-lg-10 col-12 m-auto">
        <h2 className="h2 font-weight-normal">
          {i18n.t('Waiting for an opponent')}
        </h2>
        <p className="lead mb-4">
          {i18n.t(
            'Please wait for someone to join or send an invite using the link below',
          )}
        </p>
        <div>
          <div className="d-flex justify-content-center input-group mb-3">
            <div className="input-group-prepend">
              <span className="input-group-text" id="gameUrl">
                {gameUrl}
              </span>
            </div>
            <CopyButton className="btn btn-secondary" value={gameUrl} />
            <button
              type="button"
              className="btn btn-danger rounded-right"
              data-method="delete"
              data-csrf={window.csrf_token}
              data-to={gameUrl}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaitingOpponentInfo;
