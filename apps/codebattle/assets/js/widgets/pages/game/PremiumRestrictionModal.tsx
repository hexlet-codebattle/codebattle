import React, { useState, useCallback, memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Flex, Group, Stack, Text } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '@/components/CbModal';
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
    <Modal size="xl" centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{i18n.t('Restricted Content')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Stack align="center" p="md">
          <Text size="xl" fw={700} pb="md">
            {i18n.t('Sorry! This content is for Premium subscribers only.')}
          </Text>
          <Stack>
            <Text size="lg" pb="xs">
              {i18n.t("Subscribe to Premium and you'll get:")}
            </Text>
            <ul style={{ paddingLeft: '1rem' }}>
              <li>{i18n.t('Full access to game history')}</li>
              <li>{i18n.t('Testing your own tasks')}</li>
              <li>{i18n.t('No pauses between solution checks')}</li>
            </ul>
            <Group align="center">
              <Text>{i18n.t('Not a Premium subscriber?')}</Text>
              {alreadySendPremiumRequest || !currentUserId ? (
                <Text c="dimmed">{i18n.t('Working on it.')}</Text>
              ) : (
                <>
                  <Text>{i18n.t('Want to subscribe?')}</Text>
                  {sended ? (
                    <Button color="cbSecondary" size="sm" disabled radius="md">
                      {i18n.t('Sending...')}
                    </Button>
                  ) : (
                    <Flex>
                      <Button
                        type="button"
                        data-premium-request="yes"
                        data-user-id={currentUserId}
                        color="cbSecondary"
                        size="sm"
                        radius="md"
                        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        leftSection={<FontAwesomeIcon icon="check" />}
                        onClick={handleSendRequest}
                      >
                        {i18n.t('Yes')}
                      </Button>
                      <Button
                        type="button"
                        data-premium-request="no"
                        data-user-id={currentUserId}
                        color="cbSecondary"
                        size="sm"
                        radius="md"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                        leftSection={<FontAwesomeIcon icon="times" />}
                        onClick={handleSendRequest}
                      >
                        {i18n.t('No')}
                      </Button>
                    </Flex>
                  )}
                </>
              )}
            </Group>
          </Stack>
        </Stack>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        <Button
          onClick={modal.hide}
          color="cbSecondary"
          radius="md"
          leftSection={<FontAwesomeIcon icon="times" />}
        >
          {i18n.t('Close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(PremiumRestrictionModal);
