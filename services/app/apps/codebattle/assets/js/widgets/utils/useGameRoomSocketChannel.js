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
    if (pageName === PageNames.builder) {
      const clearTask = GameRoomActions.connectToTask(
        machines.mainService,
        machines.taskService,
      )(dispatch);

      return clearTask;
    }

    const options = { cancelRedirect: false };

    const clearGame = GameRoomActions.connectToGame(machines.mainService, options)(
      dispatch,
    );
    const clearChat = ChatActions.connectToChat(useChat)(dispatch);

    return () => {
      clearGame();
      clearChat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useGameRoomSocketChannel;
