import { useEffect, useMemo } from "react";

import { useSelector, useDispatch } from "react-redux";

import * as selectors from "../selectors";
import { actions } from "../slices";

import {
  getPrivateRooms,
  filterPrivateRooms,
  getStorageKey,
  clearExpiredPrivateRooms,
  updatePrivateRooms,
} from "./chatRoom";
import getChatTopic from "./names";

const useChatRooms = (pageName = "channel", chatId) => {
  const dispatch = useDispatch();
  const page = getChatTopic(pageName, chatId);
  const rooms = useSelector(selectors.roomsSelector);
  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const storageKey = useMemo(() => getStorageKey(currentUserId), [currentUserId]);

  useEffect(() => {
    clearExpiredPrivateRooms(storageKey);
    const existingPrivateRooms = getPrivateRooms(page, storageKey);
    dispatch(actions.setPrivateRooms(existingPrivateRooms));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const privateRooms = filterPrivateRooms(rooms);
    updatePrivateRooms(privateRooms, page, storageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, storageKey]);

  return rooms;
};

export default useChatRooms;
