import React, {
  memo,
} from 'react';

import cn from 'classnames';

import Loading from '@/components/Loading';
import useJitsiRoom from '@/utils/useJitsiRoom';

import i18n from '../../../i18n';

const mapStatusToDescription = {
  loading: i18n.t('Setup Conference Room'),
  ready: i18n.t('Conference Room Is Ready'),
  joinedGameRoom: i18n.t('Conference Room Is Started'),
  notSupported: i18n.t('Not Supported Browser'),
  noHaveApiKey: i18n.t('No have jitsi api key'),
};

function ConferenceLoading({ status, hideLoader = false }) {
  return (
    <div className="d-flex flex-column">
      {!hideLoader && <Loading />}
      <small>{mapStatusToDescription[status]}</small>
    </div>
  );
}

function VideoConference() {
  const {
    ref,
    status,
  } = useJitsiRoom();

  const conferenceClassName = cn('w-100 h-100', {
    'd-none invisible absolute': status !== 'joinedGameRoom',
  });

  return (
    <>
      {status !== 'joinedGameRoom' && (
        <div className="d-flex w-100 h-100 justify-content-center align-items-center">
          <ConferenceLoading
            status={status}
            hideLoader={['notSupported', 'noHaveApiKey'].includes(status)}
          />
        </div>
      )}
      <div ref={ref} id="jaas-container" className={conferenceClassName} />
    </>
  );
}

export default memo(VideoConference);
