/* global JitsiMeetExternalAPI */
import {
  useEffect, useMemo, useRef, useState,
} from 'react';

import Gon from 'gon';
import { useDispatch, useSelector } from 'react-redux';

import { actions } from '@/slices';

import statuses from '../config/jitsiStatuses';
import * as selectors from '../selectors';

const apiKey = Gon.getAsset('jitsi_api_key');

const useJitsiRoom = () => {
  const dispatch = useDispatch();

  const ref = useRef();
  const [api, setApi] = useState(null);
  const [status, setStatus] = useState(statuses.loading);
  const userId = useSelector(selectors.currentUserIdSelector);
  const gameId = useSelector(selectors.gameIdSelector);
  const { name } = useSelector(selectors.userByIdSelector(userId));

  const {
    audioMuted,
    videoMuted,
  } = useSelector(selectors.videoConferenceSettingsSelector);

  const roomName = gameId ? `${apiKey}/codebattle_game_${gameId}` : `${apiKey}/codebattle_testing`;

  useEffect(() => {
    if (!JitsiMeetExternalAPI) {
      dispatch(actions.toggleShowVideoConferencePanel());
    }

    if (!apiKey) {
      setStatus(statuses.noHaveApiKey);
    }
  }, [dispatch]);

  useEffect(() => {
    if (status === statuses.loading && JitsiMeetExternalAPI && apiKey) {
      const newApi = new JitsiMeetExternalAPI('8x8.vc', {
        roomName,
        parentNode: ref.current,
        userInfo: {
          displayName: name,
        },
        configOverwrite: {
          startWithAudioMuted: audioMuted,
          startWithVideoMuted: videoMuted,
          prejoinPageEnabled: false,
          hideConferenceSubject: true,
          // hideConferenceTimer: true,
          toolbarButtons: [
            'settings',
          ],
        },
      });

      newApi.addListener('browserSupport', payload => {
        if (payload.supported) {
          setStatus(statuses.ready);
        } else {
          setStatus(statuses.notSupported);
        }
      });

      newApi.addListener('videoConferenceJoined', () => {
        newApi.getAvailableDevices().then(devices => {
          const { audioInput, videoInput } = devices;

          const audioAvailable = audioInput.some(item => !!item.deviceId);
          const videoAvailable = videoInput.some(item => !!item.deviceId);

          dispatch(actions.setAudioAvailable(audioAvailable));
          dispatch(actions.setVideoAvailable(videoAvailable));
        });

        setStatus(statuses.joinedGameRoom);
      });

      setApi(newApi);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (api) {
      api.isAudioMuted().then(muted => {
        if (muted !== audioMuted) {
          api.executeCommand('toggleAudio');
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioMuted]);

  useEffect(() => {
    if (api) {
      api.isVideoMuted().then(muted => {
        if (muted !== videoMuted) {
          api.executeCommand('toggleVideo');
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoMuted]);

  return useMemo(() => ({
    ref,
    status,
  }), [status]);
};

export default useJitsiRoom;
