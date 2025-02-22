/* global JitsiMeetExternalAPI */
import React from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { actions } from '@/slices';

import i18n from '../../../i18n';
import * as selectors from '../../selectors';

import VideoConferenceMediaControls from './VideoConferenceMediaControls';

function VideoConferenceButton() {
  const dispatch = useDispatch();
  const showVideoConferencePanel = useSelector(selectors.showVideoConferencePanelSelector);

  const toggleVideoConference = () => {
    dispatch(actions.toggleShowVideoConferencePanel());
  };

  if (!JitsiMeetExternalAPI) {
    return <></>;
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleVideoConference}
        className="btn btn-secondary btn-block rounded-lg"
        aria-label={
          showVideoConferencePanel
            ? 'Open Text Chat'
            : 'Open Video Chat'
        }
      >
        {
          showVideoConferencePanel
            ? i18n.t('Open Text Chat')
            : i18n.t('Open Video Chat')
        }
      </button>
      {showVideoConferencePanel && (
        <VideoConferenceMediaControls />
      )}
    </>
  );
}

export default VideoConferenceButton;
