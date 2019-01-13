import React from 'react';
import PropTypes from 'prop-types';
import i18n from 'i18next';
import copy from 'copy-to-clipboard';

const onFocus = e => e.target.select();

const WaitingOpponentInfo = ({ gameUrl }) => (
  <div className="jumbotron container text-center bg-white shadow-sm">
    <div className="col-xl-8 col-lg-10 col-12 m-auto">
      <h2 className="h2 font-weight-normal">{i18n.t('Waiting for an opponent')}</h2>
      <p className="lead text-muted">{i18n.t('Please wait for someone to join or send an invite using the link below')}</p>
      <div>
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control border-secondary"
            aria-label="Recipient's username"
            aria-describedby="basic-addon2"
            value={gameUrl}
            readOnly
            onFocus={onFocus}
          />
          <div className="input-group-append">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => copy(gameUrl)}
            >
              {i18n.t('Copy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

WaitingOpponentInfo.propTypes = {
  gameUrl: PropTypes.string.isRequired,
};

export default WaitingOpponentInfo;
