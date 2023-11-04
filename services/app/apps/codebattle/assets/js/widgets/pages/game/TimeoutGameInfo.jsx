import React from 'react';

import i18n from 'i18next';

function TimeoutGameInfo() {
  return (
    <div className="jumbotron container text-center bg-white shadow-sm">
      <div className="col-xl-8 col-lg-10 col-12 m-auto">
        <h2 className="h2 font-weight-normal">
          {i18n.t('Time is Over')}
        </h2>
        <p className="lead mb-4">
          {i18n.t('This game has not been started')}
        </p>
      </div>
    </div>
  );
}

export default TimeoutGameInfo;
