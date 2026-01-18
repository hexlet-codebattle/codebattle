import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import PageNames from '../config/pageNames';
import * as ChatActions from '../middlewares/Chat';
import * as GameRoomActions from '../middlewares/Room';
import * as selectors from '../selectors';

const useGameRoomSocketChannel = (pageName, machines) => {
  const dispatch = useDispatch();

  const useChat = useSelector(selectors.gameUseChatSelector);

  useEffect(() => {
    const channel = GameRoomActions.setGameChannel();

    const clearGameChannel = () => {
      if (channel) {
        channel.leave();
      }
    };

    if (pageName === PageNames.builder) {
      GameRoomActions.connectToTask(
        machines.mainService,
        machines.taskService,
      )(dispatch);

      return clearGameChannel;
    }

    const options = { cancelRedirect: false };

    GameRoomActions.connectToGame(machines.mainService, options)(
      dispatch,
    );
    const chatChannel = ChatActions.connectToChat(useChat, 'channel')(dispatch);

    const clearChannels = () => {
      clearGameChannel();
      if (chatChannel) {
        chatChannel.leave();
      }
    };

    return clearChannels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useGameRoomSocketChannel;
