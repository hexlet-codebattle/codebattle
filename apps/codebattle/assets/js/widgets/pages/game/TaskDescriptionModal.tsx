import React, { memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Card } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '@/components/CbModal';
import { gameTaskSelector, taskDescriptionLanguageSelector } from '@/selectors';

import i18n from '../../../i18n';
import ModalCodes from '../../config/modalCodes';
import { actions } from '../../slices';

import TaskAssignment, { type GameTask } from './TaskAssignment';

const TaskDescriptionModal = NiceModal.create(() => {
  const dispatch = useDispatch();

  const modal = useModal(ModalCodes.taskDescriptionModal);

  const task = useSelector(gameTaskSelector);
  const taskLanguage = useSelector(taskDescriptionLanguageSelector);

  const handleSetLanguage = (lang: string) => () =>
    dispatch(actions.setTaskDescriptionLanguage(lang));

  return (
    <Modal centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>{i18n.t('Task Description')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Card className="cb-card" p={0}>
          <TaskAssignment
            task={task as GameTask}
            taskLanguage={taskLanguage}
            handleSetLanguage={handleSetLanguage}
            hideContribution
            fullSize
          />
        </Card>
      </Modal.Body>
      <Modal.Footer >
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

export default memo(TaskDescriptionModal);
