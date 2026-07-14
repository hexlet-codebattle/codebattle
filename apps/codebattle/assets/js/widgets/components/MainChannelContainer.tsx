import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { type RootState } from '@/slices';

import initPresence from '../middlewares/Main';

function MainChannelContainer() {
  const dispatch = useDispatch();
  const followId = useSelector((state: RootState) => state.gameUI.followId);

  useEffect(() => {
    initPresence(followId)(dispatch);

    // The main presence channel belongs to the browser session, not this React
    // page. Phoenix reconnects and rejoins it after temporary network failures.
    // A real document unload disposes the socket with the JavaScript context.
    // The channel handles follow/unfollow after initial join via explicit pushes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default MainChannelContainer;
