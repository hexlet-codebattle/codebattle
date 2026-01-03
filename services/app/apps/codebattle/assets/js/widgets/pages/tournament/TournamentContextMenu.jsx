import React, {
  memo,
  useMemo,
  useState,
  useCallback,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Menu,
  Item,
  // Separator,
  useContextMenu,
} from 'react-contexify';
import { /* useSelector, */ useDispatch } from 'react-redux';

export const useTournamentContextMenu = ({ type }) => {
  const menuConf = useMemo(() => ({ id: `${type}-chat` }), [type]);
  const { show } = useContextMenu(menuConf);

  const [menuRequest, setMenuRequest] = useState();

  const displayMenu = useCallback((event) => {
    const { userId } = event.currentTarget.dataset;

    if (!userId) {
      return;
    }

    const request = {
      userId,
    };

    setMenuRequest(request);
    show({ event });
  }, [show]);

  return {
    menuId: menuConf.id,
    menuRequest,
    displayMenu,
  };
};

function TournamentContextMenu({
  request = {
    userId: null,
  },
  menuId,
  // inputRef,
  children,
}) {
  const dispatch = useDispatch();

  const {
    userId,
  } = request;

  //
  const handleBanClick = () => {
    if (userId) {
      dispatch();
    }
  };

  return (
    <>
      {children}
      <Menu role="menu" id={menuId}>
        <Item
          aria-label="Ban"
          onClick={handleBanClick}
        >
          <FontAwesomeIcon
            className="mr-2"
            icon="ban"
          />
          <span>Ban</span>
        </Item>
      </Menu>
    </>
  );
}

export default memo(TournamentContextMenu);
