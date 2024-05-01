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
    <>
      <Dropdown as={ButtonGroup} title="" disabled={disabled}>
        <Dropdown.Toggle className="rounded-top" split variant="secondary" id="dropdown-rooms" disabled={disabled}>
          <span className="mr-2">{activeRoom.name}</span>
        </Dropdown.Toggle>

        <Dropdown.Menu className="h-auto cb-overflow-x-hidden cb-scrollable-menu-dropdown-chat">
          {
            rooms.map(room => (
              <Dropdown.Item
                href="#"
                key={room.targetUserId || room.name}
                onSelect={() => dispatch(actions.setActiveRoom(room))}
              >
                {room.name}
              </Dropdown.Item>
            ))
          }
        </Dropdown.Menu>
      </Dropdown>
    </>
  );
}
