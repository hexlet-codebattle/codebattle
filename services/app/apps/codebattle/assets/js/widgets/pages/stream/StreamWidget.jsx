import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { connectToGame, setGameChannel } from '@/middlewares/Room';

import { connectToStream } from '../../middlewares/Stream';

function StreamWidget({ gameService, waitingRoomService }) {
  const dispatch = useDispatch();
  const gameId = useSelector(state => state.game.id);

  console.log(gameId);
  useEffect(() => {
    dispatch(connectToStream());
  }, []);

  useEffect(() => {
    const channel = setGameChannel(gameId);

    if (gameId) {
      const options = { cancelRedirect: true };
      connectToGame(gameService, waitingRoomService, options)(dispatch);
    }

    const clearChannel = () => {
      if (channel) {
        channel.leave();
      }
    };

    return clearChannel;
  }, [gameId, gameService, waitingRoomService, dispatch]);

  return <div>Stream Widget</div>;
}

export default StreamWidget;
