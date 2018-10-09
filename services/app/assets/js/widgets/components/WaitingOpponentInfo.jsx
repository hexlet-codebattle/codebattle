import React from 'react';
import PropTypes from 'prop-types';
import i18n from 'i18next';
import copy from 'copy-to-clipboard';

const onFocus = e => e.target.select();

const WaitingOpponentInfo = ({ gameUrl }) => (
  <div className="jumbotron jumbotron-fluid">
    <div className="container">
      <h1 className="display-4">{i18n.t('Waiting for an opponent')}</h1>
      <p className="lead">{i18n.t('Please wait for someone to join or send an invite using the link below')}</p>
      <div className="row">
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            aria-label="Recipient's username"
            aria-describedby="basic-addon2"
            value={gameUrl}
            readOnly
            onFocus={onFocus}
          />
          <div className="input-group-append">
            <button
              className="btn btn-outline-primary"
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
