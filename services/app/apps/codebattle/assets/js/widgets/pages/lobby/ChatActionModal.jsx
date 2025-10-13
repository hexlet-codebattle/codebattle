import React, {
  useCallback,
} from 'react';

import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import UserInfo from '../../components/UserInfo';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as selectors from '../../selectors';
import { actions } from '../../slices';

function ChatActionModal({
  presenceList,
  chatInputRef,
  modalShowing,
  setModalShowing,
}) {
  const dispatch = useDispatch();

  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const handleCloseModal = useCallback(() => {
    setModalShowing({ opened: false });
  }, [setModalShowing]);
  const createBattleInvite = useCallback(event => {
    event.preventDefault();

    const { userId, userName } = event.currentTarget.dataset;
    setModalShowing({ opened: false });

    dispatch(
      actions.showCreateGameInviteModal({
        opponentInfo: { id: Number(userId), name: userName },
      }),
    );
  }, [dispatch, setModalShowing]);
  const openDirect = useCallback(event => {
    event.preventDefault();

    const { userId, userName } = event.currentTarget.dataset;
    setModalShowing({ opened: false });

    dispatch(lobbyMiddlewares.openDirect(Number(userId), userName));
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [dispatch, chatInputRef, setModalShowing]);

  const title = modalShowing.action === 'sendMessage'
    ? 'Send private message'
    : 'Send battle invite';
  const handleSelectPlayer = modalShowing.action === 'sendMessage'
    ? openDirect
    : createBattleInvite;

  return (
    <Modal contentClassName="cb-bg-panel cb-text h-75" show={modalShowing.opened} onHide={handleCloseModal}>
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-auto">
        {modalShowing.action && (
          <div className="d-flex flex-column">
            {presenceList.map(presenceUser => (
              currentUserId !== presenceUser.id && (
                <div
                  role="button"
                  tabIndex={0}
                  className="btn btn-secondary cb-btn-secondary cb-rounded mb-2 p-3"
                  key={presenceUser.id}
                  data-user-id={presenceUser.id}
                  data-user-name={presenceUser.user.name}
                  onClick={handleSelectPlayer}
                  onKeyPress={handleSelectPlayer}
                >
                  <UserInfo user={presenceUser.user} hideInfo hideOnlineIndicator />
                </div>
              )
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default ChatActionModal;
