import React, {
  memo,
  useMemo,
  useState,
  useCallback,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Menu,
  Item,
  // Separator,
  useContextMenu,
} from 'react-contexify';
import { /* useSelector, */ useDispatch } from 'react-redux';

import i18n from '../../../i18n';

interface TournamentContextMenuRequest {
  userId: string | null;
}

export const useTournamentContextMenu = ({ type }: { type: string }) => {
  const menuConf = useMemo(() => ({ id: `${type}-chat` }), [type]);
  const { show } = useContextMenu(menuConf);

  const [menuRequest, setMenuRequest] = useState<TournamentContextMenuRequest>();

  const displayMenu = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const { userId } = event.currentTarget.dataset;

      if (!userId) {
        return;
      }

      const request = {
        userId,
      };

      setMenuRequest(request);
      show({ event });
    },
    [show],
  );

  return {
    menuId: menuConf.id,
    menuRequest,
    displayMenu,
  };
};

interface TournamentContextMenuProps {
  request?: TournamentContextMenuRequest;
  menuId: string;
  children?: ReactNode;
}

function TournamentContextMenu({
  request = {
    userId: null,
  },
  menuId,
  // inputRef,
  children,
}: TournamentContextMenuProps) {
  const dispatch = useDispatch();

  const { userId } = request;

  //
  const handleBanClick = () => {
    if (userId) {
      // dispatch is called with no action here (placeholder); cast to preserve behavior
      (dispatch as () => void)();
    }
  };

  return (
    <>
      {children}
      <Menu role="menu" id={menuId}>
        <Item aria-label={i18n.t('Ban')} onClick={handleBanClick}>
          <FontAwesomeIcon className="mr-2" icon="ban" />
          <span>{i18n.t('Ban')}</span>
        </Item>
      </Menu>
    </>
  );
}

export default memo(TournamentContextMenu);
