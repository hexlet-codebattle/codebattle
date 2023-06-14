import React from 'react';
import { ButtonGroup, Dropdown, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../selectors';
import { actions } from '../slices';

export default () => {
  const dispatch = useDispatch();

  const rooms = useSelector(selectors.roomsSelector);
  const activeRoom = useSelector(selectors.activeRoomSelector);

  return (
    <>
      <Dropdown as={ButtonGroup} title="" className="mr-2">
        <Dropdown.Toggle split variant="secondary" id="dropdown-split-basic" />
        <Button variant="secondary">{activeRoom.name}</Button>

        <Dropdown.Menu>
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
        </Dropdown.Menu>
      </Dropdown>
    </>
  );
};
