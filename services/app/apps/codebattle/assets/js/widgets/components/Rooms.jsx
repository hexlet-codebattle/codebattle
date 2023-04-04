import React from 'react';
import { DropdownButton, Dropdown } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../selectors';
import { actions } from '../slices';

export default () => {
  const dispatch = useDispatch();

  const rooms = useSelector(selectors.roomsSelector);
  const activeRoom = useSelector(selectors.activeRoomSelector);

  return (
    <>
      <DropdownButton id="dropdown-basic-button" title="" variant="secondary" className="mr-2">
        {
          rooms.map(room => (
            <Dropdown.Item
              href="#"
              key={room.id}
              onSelect={() => dispatch(actions.setActiveRoom(room))}
            >
              {room.name}
            </Dropdown.Item>
          ))
        }
      </DropdownButton>
      <div className="flex-grow-1">{activeRoom.name}</div>
    </>
  );
};
