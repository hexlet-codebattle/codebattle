import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import * as ChatActions from '../middlewares/Chat';
import * as GameRoomActions from '../middlewares/Room';
import * as selectors from '../selectors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useGameRoomSocketChannel = (_pageName: string, machines: { mainService: any }) => {
  const dispatch = useDispatch();

  const useChat = useSelector(selectors.gameUseChatSelector);

  useEffect(() => {
    const channel = GameRoomActions.setGameChannel();

    const clearGameChannel = () => {
      if (channel) {
        channel.leave();
      }
    };

    const options = { cancelRedirect: false };

    GameRoomActions.connectToGame(machines.mainService, options)(dispatch);
    const chatChannel = ChatActions.connectToChat(useChat, 'channel', undefined)(dispatch);

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
