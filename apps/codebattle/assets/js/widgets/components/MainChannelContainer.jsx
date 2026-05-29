import { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";

import initPresence from "../middlewares/Main";

function MainChannelContainer() {
  const dispatch = useDispatch();
  const followId = useSelector((state) => state.gameUI.followId);

  useEffect(() => {
    const channel = initPresence(followId)(dispatch);

    return () => {
      channel.leave();
    };
    // The channel handles follow/unfollow after initial join via explicit pushes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default MainChannelContainer;
