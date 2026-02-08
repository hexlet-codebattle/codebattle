import React from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../selectors';
import { actions } from '../slices';

export default function Rooms({ disabled }) {
  const dispatch = useDispatch();

  const rooms = useSelector(selectors.roomsSelector);
  const activeRoom = useSelector(selectors.activeRoomSelector);

  const dropdownClassName = cn('h-auto cb-overflow-x-hidden cb-scrollable-menu-dropdown-chat cb-bg-highlight-panel');

  return (
    <Dropdown as={ButtonGroup} title="" disabled={disabled}>
      <Dropdown.Toggle className="rounded-top cb-btn-secondary" split variant="secondary" id="dropdown-rooms" disabled={disabled}>
        <span className="mr-2">{i18next.t(activeRoom.name)}</span>
      </Dropdown.Toggle>

      <Dropdown.Menu className={dropdownClassName}>
        {
            rooms.map((room) => (
              <Dropdown.Item
                as="a"
                href="#"
                className="cb-text"
                key={room.targetUserId || room.name}
                onSelect={() => dispatch(actions.setActiveRoom(room))}
              >
                {i18next.t(room.name)}
              </Dropdown.Item>
            ))
          }
      </Dropdown.Menu>
    </Dropdown>
  );
}
