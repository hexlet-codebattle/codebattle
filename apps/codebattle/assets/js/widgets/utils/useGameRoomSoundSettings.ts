import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import sound from '../lib/sound';
import { actions } from '../slices';

const useGameRoomSoundSettings = () => {
  const dispatch = useDispatch();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mute = useSelector((state: any) => state.user.settings.mute);

  useEffect(() => {
    const muteSound = (e: KeyboardEvent) => {
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
