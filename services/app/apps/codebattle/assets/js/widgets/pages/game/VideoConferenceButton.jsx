/* global JitsiMeetExternalAPI */
import React from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { actions } from '@/slices';

import i18n from '../../../i18n';
import * as selectors from '../../selectors';

function VideoConferenceButton() {
  const dispatch = useDispatch();

  // const { audioMute, videoMute } = useSelector(selectors.videoConferenceSettingsSelector);
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
      {/* {showVideoConferencePanel && ( */}
      {/*   <div className="d-flex"> */}
      {/*     <button */}
      {/*       type="button" */}
      {/*       className="btn btn-secondary btn-block w-100 rounded-lg" */}
      {/*       aria-label="Mute audio" */}
      {/*     /> */}
      {/*     <button */}
      {/*       type="button" */}
      {/*       className="btn btn-secondary btn-block w-100 rounded-lg" */}
      {/*       aria-label="Mute video" */}
      {/*     /> */}
      {/*   </div> */}
      {/* )} */}
    </>
  );
}

export default VideoConferenceButton;
