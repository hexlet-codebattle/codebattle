import React, { useCallback, type RefObject } from 'react';

import { Button, Stack } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '@/components/CbModal';

import { type UserNameUser } from '../../components/UserName';
import UserInfo from '../../components/UserInfo';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as selectors from '../../selectors';
import { actions, type AppDispatch } from '../../slices';

interface PresenceUser {
  id: number;
  user: UserNameUser;
}

interface ModalShowingState {
  opened: boolean;
  action?: string;
}

interface ChatActionModalProps {
  presenceList: PresenceUser[];
  chatInputRef: RefObject<{ focus: () => void } | null>;
  modalShowing: ModalShowingState;
  setModalShowing: (state: ModalShowingState) => void;
}

function ChatActionModal({
  presenceList,
  chatInputRef,
  modalShowing,
  setModalShowing,
}: ChatActionModalProps) {
  const dispatch = useDispatch<AppDispatch>();

  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const handleCloseModal = useCallback(() => {
    setModalShowing({ opened: false });
  }, [setModalShowing]);
  const createBattleInvite = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      const { userId, userName } = event.currentTarget.dataset;
      setModalShowing({ opened: false });

      dispatch(
        actions.showCreateGameInviteModal({
          opponentInfo: { id: Number(userId), name: userName },
        }),
      );
    },
    [dispatch, setModalShowing],
  );
  const openDirect = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      const { userId, userName } = event.currentTarget.dataset;
      setModalShowing({ opened: false });

      dispatch(lobbyMiddlewares.openDirect(Number(userId), userName ?? ''));
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    },
    [dispatch, chatInputRef, setModalShowing],
  );

  const title =
    modalShowing.action === 'sendMessage' ? 'Send private message' : 'Send battle invite';
  const handleSelectPlayer =
    modalShowing.action === 'sendMessage' ? openDirect : createBattleInvite;

  return (
    <Modal contentClassName="cb-text h-75" show={modalShowing.opened} onHide={handleCloseModal}>
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-auto">
        {modalShowing.action && (
          <Stack gap="sm">
            {presenceList.map(
              (presenceUser) =>
                currentUserId !== presenceUser.id && (
                  <Button
                    color="cbSecondary"
                    fullWidth
                    justify="flex-start"
                    h="auto"
                    p="md"
                    key={presenceUser.id}
                    data-user-id={presenceUser.id}
                    data-user-name={presenceUser.user.name}
                    onClick={handleSelectPlayer}
                  >
                    <UserInfo user={presenceUser.user} hideInfo hideOnlineIndicator />
                  </Button>
                ),
            )}
          </Stack>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default ChatActionModal;
