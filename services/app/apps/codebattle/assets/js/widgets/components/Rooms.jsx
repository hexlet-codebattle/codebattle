import React from 'react';
import { ButtonGroup, Dropdown } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../selectors';
import { actions } from '../slices';

export default () => {
  const dispatch = useDispatch();

  const rooms = useSelector(selectors.roomsSelector);
  const activeRoom = useSelector(selectors.activeRoomSelector);

  return (
    <>
      <Dropdown as={ButtonGroup} title="">
        <Dropdown.Toggle className="rounded-top" split variant="secondary" id="dropdown-rooms">
          <span className="mr-2">{activeRoom.name}</span>
        </Dropdown.Toggle>

        <Dropdown.Menu>
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
};
