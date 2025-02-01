import React, { useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import { actions } from '@/slices';

import * as selectors from '../../selectors';

function VideoConferenceMediaControls() {
  const dispatch = useDispatch();

  const { audioMuted, videoMuted } = useSelector(selectors.videoConferenceSettingsSelector);
  const { audioAvailable, videoAvailable } = useSelector(selectors.videoConferenceMediaAvailableSelector);

  useEffect(() => () => {
    dispatch(actions.setVideoAvailable(false));
    dispatch(actions.setAudioAvailable(false));
  }, [dispatch]);

  const audioMuteBtnClassName = cn('btn btn-secondary w-100 h-100 rounded-left', {
    disabled: !audioAvailable,
  });
  const videoMuteBtnClassName = cn('btn btn-secondary w-100 h-100 rounded-right', {
    disabled: !videoAvailable,
  });

  return (
    <div className="d-flex btn-block mt-2">
      <button
        type="button"
        className={audioMuteBtnClassName}
        aria-label="Mute audio"
        onClick={() => dispatch(actions.setAudioMuted(!audioMuted))}
        disabled={!audioAvailable}
      >
        <FontAwesomeIcon icon={audioMuted ? 'microphone-slash' : 'microphone'} />
      </button>
      <button
        type="button"
        className={videoMuteBtnClassName}
        aria-label="Mute video"
        onClick={() => dispatch(actions.setVideoMuted(!videoMuted))}
        disabled={!videoAvailable}
      >
        <FontAwesomeIcon icon={videoMuted ? 'video-slash' : 'video'} />
      </button>
    </div>
  );
}

export default VideoConferenceMediaControls;
