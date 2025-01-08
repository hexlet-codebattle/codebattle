/* global JitsiMeetExternalAPI */
import {
  useEffect, useMemo, useRef, useState,
} from 'react';

import Gon from 'gon';
import { useDispatch, useSelector } from 'react-redux';

import { actions } from '@/slices';

import * as selectors from '../selectors';

const apiKey = Gon.getAsset('jitsi_api_key');

const useJitsiRoom = () => {
  const dispatch = useDispatch();

  const ref = useRef();
  const [status, setStatus] = useState('loading');
  const userId = useSelector(selectors.currentUserIdSelector);
  const gameId = useSelector(selectors.gameIdSelector);
  const { name } = useSelector(state => state.user.users[userId]);

  const roomName = gameId ? `${apiKey}/codebattle_game_${gameId}` : `${apiKey}/codebattle_testing`;

  useEffect(() => {
    if (!JitsiMeetExternalAPI) {
      dispatch(actions.toggleShowVideoConferencePanel());
    }

    if (!apiKey) {
      setStatus('noHaveApiKey');
    }
  }, [dispatch]);

  useEffect(() => {
    if (status === 'loading' && JitsiMeetExternalAPI && apiKey) {
      const newApi = new JitsiMeetExternalAPI('8x8.vc', {
        roomName,
        parentNode: ref.current,
        userInfo: {
          displayName: name,
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          hideConferenceSubject: true,
          // hideConferenceTimer: true,
          toolbarButtons: [
            'camera',
            'microphone',
            'settings',
          ],
        },
      });

      newApi.addListener('browserSupport', payload => {
        if (payload.supported) {
          setStatus('ready');
        } else {
          setStatus('notSupported');
        }
      });

      newApi.addListener('videoConferenceJoined', () => {
        setStatus('joinedGameRoom');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return useMemo(() => ({
    ref,
    status,
  }), [ref, status]);
};

export default useJitsiRoom;
