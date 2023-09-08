import { useEffect, useMemo } from 'react';

import { useSelector, useDispatch } from 'react-redux';

import {
  getPrivateRooms,
  filterPrivateRooms,
  getStorageKey,
  clearExpiredPrivateRooms,
  updatePrivateRooms,
} from '../middlewares/Room';
import * as selectors from '../selectors';
import { actions } from '../slices';

import getChatName from './names';

const useChatRooms = (key) => {
  const dispatch = useDispatch();
  const pageName = getChatName(key);
  const rooms = useSelector(selectors.roomsSelector);
  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const storageKey = useMemo(() => getStorageKey(currentUserId), [currentUserId]);

  useEffect(() => {
    clearExpiredPrivateRooms(storageKey);
    const existingPrivateRooms = getPrivateRooms(pageName, storageKey);
    dispatch(actions.setPrivateRooms(existingPrivateRooms));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const privateRooms = filterPrivateRooms(rooms);
    updatePrivateRooms(privateRooms, pageName, storageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, storageKey]);

  return rooms;
};

export default useChatRooms;
