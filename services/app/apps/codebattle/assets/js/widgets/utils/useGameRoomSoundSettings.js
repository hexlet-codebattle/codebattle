import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import sound from '../lib/sound';
import { actions } from '../slices';

const useGameRoomSoundSettings = () => {
  const dispatch = useDispatch();

  const mute = useSelector(state => state.user.settings.mute);

  useEffect(() => {
    const muteSound = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();

        if (mute) {
          sound.toggle();
        } else {
          sound.toggle(0);
        }

        dispatch(actions.toggleMuteSound());
      }
    };

    window.addEventListener('keydown', muteSound);

    return () => {
      window.removeEventListener('keydown', muteSound);
    };
  }, [dispatch, mute]);

  return mute;
};

export default useGameRoomSoundSettings;
