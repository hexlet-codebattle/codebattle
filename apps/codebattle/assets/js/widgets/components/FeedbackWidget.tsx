import React, { useCallback, memo, useMemo, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Group, Text, Textarea } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import i18n from '../../i18n';
import AlertCodes from '../config/alertCodes';
import { currentUserNameSelector } from '../selectors/index';
import { actions } from '../slices';

import Modal from './CbModal';

interface FeedbackPayload {
  attachments: {
    author_name: string;
    fallback: string;
    text: string;
    title_link: string;
  }[];
}

const sendToServer = (payload: FeedbackPayload) =>
  fetch('/api/v1/feedback', {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      'x-csrf-token': window.csrf_token as string,
    },
    body: JSON.stringify(payload),
  });

const STATUS_OPTIONS = ['Bug', 'Suggestion', 'Question'];

function FeedbackWidget() {
  const dispatch = useDispatch();
  const currentUserName = useSelector(currentUserNameSelector);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAlert = useCallback(
    (alertCode: string) => {
      dispatch(actions.addAlert({ [Date.now()]: alertCode }));
    },
    [dispatch],
  );

  const isSubmitDisabled = useMemo(() => !text.trim() || isSubmitting, [isSubmitting, text]);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
  }, [isSubmitting]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setIsSubmitting(true);
      const payload: FeedbackPayload = {
        attachments: [
          {
            author_name: String(currentUserName || 'Anonymous'),
            fallback: status,
            text: text.trim(),
            title_link: window.location.href,
          },
        ],
      };

      sendToServer(payload)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Feedback request failed');
          }

          addAlert(AlertCodes.feedbackSendSuccessful);
          setText('');
          setIsOpen(false);
        })
        .catch(() => {
          addAlert(AlertCodes.feedbackSendError);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [addAlert, currentUserName, status, text],
  );

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        color="cbSecondary"
        size="sm"
        radius="md"
        leftSection={<FontAwesomeIcon icon={['fas', 'rss']} />}
        style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 1080 }}
      >
        {i18n.t('Feedback')}
      </Button>
      {isOpen && (
        <Modal centered show={isOpen} onHide={closeModal} contentClassName="cb-text">
          <form onSubmit={onSubmit}>
            <Modal.Header className="cb-border-color" closeButton>
              <Modal.Title>{i18n.t('Send feedback')}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Box mb="md">
                <Text component="label" htmlFor="feedback-status" size="sm" mb="xs" display="block">
                  {i18n.t('Type')}
                </Text>
                <Group gap="xs" id="feedback-status" role="radiogroup" aria-label={i18n.t('Type')}>
                  {STATUS_OPTIONS.map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      radius="md"
                      color="cbSecondary"
                      variant={status === option ? 'filled' : 'outline'}
                      className={status === option ? undefined : 'cb-btn-outline-secondary'}
                      role="radio"
                      aria-checked={status === option}
                      tabIndex={0}
                      onClick={() => setStatus(option)}
                    >
                      {i18n.t(option)}
                    </Button>
                  ))}
                </Group>
              </Box>
              <Textarea
                id="feedback-text"
                label={i18n.t('Message')}
                aria-label={i18n.t('Message')}
                rows={5}
                value={text}
                onChange={(event) => setText(event.target.value)}
                required
              />
            </Modal.Body>
            <Modal.Footer className="cb-border-color">
              <Button
                type="button"
                color="cbSecondary"
                radius="md"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                {i18n.t('Cancel')}
              </Button>
              <Button type="submit" color="cbSecondary" radius="md" disabled={isSubmitDisabled}>
                {isSubmitting ? i18n.t('Sending...') : i18n.t('Send')}
              </Button>
            </Modal.Footer>
          </form>
        </Modal>
      )}
    </>
  );
}

export default memo(FeedbackWidget);
