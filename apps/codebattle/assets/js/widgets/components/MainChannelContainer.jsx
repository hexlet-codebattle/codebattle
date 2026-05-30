import { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";

import initPresence from "../middlewares/Main";

function MainChannelContainer() {
  const dispatch = useDispatch();
  const followId = useSelector((state) => state.gameUI.followId);

  useEffect(() => {
    console.log("[main_channel] mounting, initPresence");
    const channel = initPresence(followId)(dispatch);
    console.log("[main_channel] channel", channel);

    return () => {
      channel.leave();
    };
    // The channel handles follow/unfollow after initial join via explicit pushes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default MainChannelContainer;
