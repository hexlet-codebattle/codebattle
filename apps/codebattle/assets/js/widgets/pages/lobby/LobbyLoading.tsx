import React from 'react';

import i18n from '../../../i18n';

function LobbyLoading() {
  return (
    <div className="container-lg cb-text cb-lobby-loading" role="status" aria-live="polite">
      <span className="sr-only">{i18n.t('Loading...')}</span>
      <div aria-hidden="true">
        <div className="cb-lobby-loading-hero">
          <div className="cb-lobby-loading-emblem">
            <span>&lt;/&gt;</span>
          </div>
          <div className="cb-lobby-loading-copy">
            <span className="cb-lobby-loading-kicker">
              <span className="cb-lobby-loading-status-dot" />
              {i18n.t('Codebattle lobby')}
            </span>
            <h1>{i18n.t('Preparing your arena')}</h1>
            <p>{i18n.t('Syncing live games, rankings, and challengers...')}</p>
            <div className="cb-lobby-loading-progress">
              <span />
            </div>
          </div>
        </div>
        <div className="d-flex flex-column-reverse flex-lg-row my-0 my-lg-2">
          <div className="col-12 col-lg-8 p-0 pr-lg-2 my-2 my-lg-0">
            <div className="cb-bg-panel cb-rounded d-flex flex-column p-3 cb-lobby-loading-main">
              <span className="cb-text-skeleton w-50 mx-auto mb-4" />
              <span className="cb-text-skeleton w-100 mb-2" />
              <span className="cb-text-skeleton w-75 mx-auto mb-4" />
              <div className="d-flex flex-column flex-md-row mt-auto">
                <span className="cb-text-skeleton flex-fill mx-md-2 mb-2 mb-md-0" />
                <span className="cb-text-skeleton flex-fill mx-md-2 mb-2 mb-md-0" />
                <span className="cb-text-skeleton flex-fill mx-md-2" />
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4 p-0 pl-lg-2 my-2 my-lg-0">
            <div className="cb-bg-panel cb-rounded d-flex flex-column align-items-center p-3 cb-lobby-loading-profile">
              <span className="cb-text-skeleton cb-lobby-loading-avatar mb-3" />
              <span className="cb-text-skeleton w-50 mb-3" />
              <div className="d-flex w-100 cb-bg-highlight-panel p-3">
                <span className="cb-text-skeleton flex-fill mx-1" />
                <span className="cb-text-skeleton flex-fill mx-1" />
                <span className="cb-text-skeleton flex-fill mx-1" />
              </div>
            </div>
          </div>
        </div>
        <div className="d-flex flex-column flex-lg-row p-0">
          <div className="col-12 col-lg-8 p-0 pr-lg-2">
            <div className="cb-bg-panel cb-rounded p-3 cb-lobby-loading-secondary">
              <span className="cb-text-skeleton w-25 d-block mb-4" />
              <span className="cb-text-skeleton w-100 d-block mb-3" />
              <span className="cb-text-skeleton w-75 d-block mb-3" />
              <span className="cb-text-skeleton w-50 d-block" />
            </div>
          </div>
          <div className="col-12 col-lg-4 p-0 pl-lg-2 mt-2 mt-lg-0">
            <div className="cb-bg-panel cb-rounded p-3 cb-lobby-loading-secondary">
              <span className="cb-text-skeleton w-50 d-block mb-4" />
              <span className="cb-text-skeleton w-100 d-block mb-3" />
              <span className="cb-text-skeleton w-75 d-block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LobbyLoading;
