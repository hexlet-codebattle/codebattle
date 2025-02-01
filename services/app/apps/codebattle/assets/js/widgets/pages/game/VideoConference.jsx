import React, {
  memo,
} from 'react';

import cn from 'classnames';

import Loading from '@/components/Loading';
import useJitsiRoom from '@/utils/useJitsiRoom';

import i18n from '../../../i18n';
import statuses from '../../config/jitsiStatuses';

const mapStatusToDescription = {
  [statuses.loading]: i18n.t('Setup Conference Room'),
  [statuses.ready]: i18n.t('Conference Room Is Ready'),
  [statuses.joinedGameRoom]: i18n.t('Conference Room Is Started'),
  [statuses.notSupported]: i18n.t('Not Supported Browser'),
  [statuses.noHaveApiKey]: i18n.t('No have jitsi api key'),
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

  const loadingClassName = cn('w-100 h-100', {
    'd-flex justify-content-center align-items-center': status !== statuses.joinedGameRoom,
    'd-none invisible absolute': status === statuses.joinedGameRoom,
  });
  const conferenceClassName = cn('w-100 h-100', {
    'd-none invisible absolute': status !== statuses.joinedGameRoom,
  });

  return (
    <>
      <div className={loadingClassName}>
        <ConferenceLoading
          status={status}
          hideLoader={[statuses.notSupported, statuses.noHaveApiKey].includes(status)}
        />
      </div>
      <div ref={ref} className={conferenceClassName} />
    </>
  );
}

export default memo(VideoConference);
