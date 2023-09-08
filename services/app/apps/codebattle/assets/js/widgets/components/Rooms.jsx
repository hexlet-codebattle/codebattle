import React from 'react';

import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../selectors';
import { actions } from '../slices';

export default function Rooms({ disabled }) {
  const dispatch = useDispatch();

  const rooms = useSelector(selectors.roomsSelector);
  const activeRoom = useSelector(selectors.activeRoomSelector);

  return (
    <Dropdown as={ButtonGroup} disabled={disabled} title="">
      <Dropdown.Toggle
        split
        className="rounded-top"
        disabled={disabled}
        id="dropdown-rooms"
        variant="secondary"
      >
        <span className="mr-2">{activeRoom.name}</span>
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {rooms.map((room) => (
          <Dropdown.Item
            key={room.targetUserId || room.name}
            href="#"
            onSelect={() => dispatch(actions.setActiveRoom(room))}
          >
            {room.name}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
