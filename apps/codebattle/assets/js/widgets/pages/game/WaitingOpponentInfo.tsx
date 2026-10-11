import React from 'react';

import i18n from 'i18next';

import CopyButton from '../../components/CopyButton';
import InviteQrCode from '../../components/InviteQrCode';

interface WaitingOpponentInfoProps {
  gameUrl: string;
}

// Absolute join URL (origin + path) without query string or hash.
export const buildJoinUrl = (gameUrl: string) => {
  const url = new URL(gameUrl, window.location.origin);

  return `${url.origin}${url.pathname}`;
};

function WaitingOpponentInfo({ gameUrl }: WaitingOpponentInfoProps) {
  const joinUrl = buildJoinUrl(gameUrl);

  return (
    <div className="container py-3">
      <div className="col-xl-8 col-lg-10 col-12 mx-auto px-0">
        <div className="cb-bg-panel cb-text cb-rounded shadow-sm p-4 p-lg-5 text-center">
          <h2 className="h2 font-weight-normal text-white">{i18n.t('Waiting for an opponent')}</h2>
          <p className="lead mb-4 text-white-50">
            {i18n.t('Please wait for someone to join or send an invite using the link below')}
          </p>
          <div className="d-flex justify-content-center">
            <div className="input-group mb-0" style={{ width: 'auto', maxWidth: '100%' }}>
              <div className="input-group-prepend">
                <span
                  className="input-group-text cb-bg-panel cb-text cb-border-color text-break text-left"
                  id="gameUrl"
                  style={{ maxWidth: '100%' }}
                >
                  {gameUrl}
                </span>
              </div>
              <CopyButton className="btn btn-secondary cb-btn-secondary" value={gameUrl} />
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
          <div className="d-flex flex-column align-items-center mt-4">
            <InviteQrCode value={joinUrl} size={256} testId="game-invite-qr-code" />
            <small className="mt-2 text-white-50">
              {i18n.t('Scan the QR code to join the game')}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaitingOpponentInfo;
