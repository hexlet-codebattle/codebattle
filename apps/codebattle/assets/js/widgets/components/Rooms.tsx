import React from 'react';

import { Button, Menu } from '@mantine/core';
import i18next from 'i18next';
import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../selectors';
import { actions } from '../slices';

interface RoomsProps {
  disabled?: boolean;
}

export default function Rooms({ disabled }: RoomsProps) {
  const dispatch = useDispatch();

  const rooms = useSelector(selectors.roomsSelector);
  const activeRoom = useSelector(selectors.activeRoomSelector);

  return (
    <Menu disabled={disabled} width="target">
      <Menu.Target>
        <Button
          className="rounded-top cb-btn-secondary"
          color="cbSecondary"
          id="dropdown-rooms"
          disabled={disabled}
        >
          <span className="mr-2">{i18next.t(activeRoom.name)}</span>
        </Button>
      </Menu.Target>

      <Menu.Dropdown className="h-auto cb-overflow-x-hidden cb-scrollable-menu-dropdown-chat cb-bg-highlight-panel">
        {rooms.map((room) => (
          <Menu.Item
            className="cb-text"
            key={room.targetUserId || room.name}
            onClick={() => dispatch(actions.setActiveRoom(room))}
          >
            {i18next.t(room.name)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
