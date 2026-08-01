import React, { useState, useCallback, memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '@/components/BootstrapModal';
import { sendPremiumRequest } from '@/middlewares/Users';
import { currentUserIdSelector, userSettingsSelector } from '@/selectors';
import { type AppDispatch } from '@/slices';

import ModalCodes from '../../config/modalCodes';
import i18n from '../../../i18n';

const PremiumRestrictionModal = NiceModal.create(() => {
  const dispatch = useDispatch<AppDispatch>();

  const [sended, setSended] = useState(false);
  const modal = useModal(ModalCodes.premiumRestrictionModal);

  const currentUserId = useSelector(currentUserIdSelector);
  const { alreadySendPremiumRequest } = useSelector(userSettingsSelector);

  const handleSendRequest = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { premiumRequest, userId } = event.currentTarget.dataset;

      setSended(true);
      setTimeout(() => setSended(false), 2000);

      dispatch(sendPremiumRequest(premiumRequest as string, Number(userId)));
    },
    [dispatch, setSended],
  );

  return (
    <Modal
      size="xl"
      centered
      show={modal.visible}
      onHide={modal.hide}
      contentClassName="cb-bg-panel cb-text"
    >
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{i18n.t('Restricted Content')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column align-items-xl-center p-3">
          <h3 className="pb-3">{i18n.t('Sorry! This content is for Premium subscribers only.')}</h3>
          <div className="d-flex flex-column">
            <h5 className="pb-1">{i18n.t("Subscribe to Premium and you'll get:")}</h5>
            <ul className="pl-3">
              <li>{i18n.t('Full access to game history')}</li>
              <li>{i18n.t('Testing your own tasks')}</li>
              <li>{i18n.t('No pauses between solution checks')}</li>
            </ul>
            <div className="d-flex align-items-center">
              <span className="mr-2">{i18n.t('Not a Premium subscriber?')}</span>
              {alreadySendPremiumRequest || !currentUserId ? (
                <span className="text-muted">{i18n.t('Working on it.')}</span>
              ) : (
                <>
                  <span className="mr-2">{i18n.t('Want to subscribe?')}</span>
                  <div className="btn-group">
                    {sended ? (
                      <div className="btn btn-sm btn-secondary cb-btn-secondary cb-rounded disabled">
                        {i18n.t('Sending...')}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          data-premium-request="yes"
                          data-user-id={currentUserId}
                          className="btn btn-sm btn-secondary cb-btn-secondary rounded-left"
                          onClick={handleSendRequest}
                        >
                          <FontAwesomeIcon className="mr-2" icon="check" />
                          {i18n.t('Yes')}
                        </button>
                        <button
                          type="button"
                          data-premium-request="no"
                          data-user-id={currentUserId}
                          className="btn btn-sm btn-secondary cb-btn-secondary rounded-right"
                          onClick={handleSendRequest}
                        >
                          <FontAwesomeIcon className="mr-2" icon="times" />
                          {i18n.t('No')}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        <div className="d-flex justify-content-end w-100">
          <Button onClick={modal.hide} className="btn btn-secondary cb-btn-secondary cb-rounded">
            <FontAwesomeIcon icon="times" className="mr-2" />
            {i18n.t('Close')}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(PremiumRestrictionModal);
