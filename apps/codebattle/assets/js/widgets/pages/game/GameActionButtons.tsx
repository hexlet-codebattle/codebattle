import React, { useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Menu } from '@mantine/core';
import { useDispatch } from 'react-redux';

import Modal from '@/components/CbModal';
import { type AppDispatch } from '@/slices';

import i18next from '../../../i18n';
import { sendGiveUp, resetTextToTemplateAndSend } from '../../middlewares/Room';
import { actions } from '../../slices';

interface CheckResultButtonProps {
  onClick?: () => void;
  status: string;
}

function CheckResultButton({ onClick, status }: CheckResultButtonProps) {
  const dispatch = useDispatch();
  const commonProps = {
    type: 'button' as const,
    className: 'btn btn-sm btn-outline-success cb-btn-outline-success btn-check cb-rounded',
    title: `${i18next.t('Check solution')}&#013;Ctrl + Enter`,
    'data-toggle': 'tooltip',
    'data-guide-id': 'CheckResultButton',
    'data-placement': 'top',
  };

  const commonEnabledProps = {
    ...commonProps,
    onClick,
  };

  switch (status) {
    case 'enabled':
      return (
        <button {...commonEnabledProps}>
          <FontAwesomeIcon icon={['fas', 'play-circle']} className="mr-2 success" />
          {i18next.t('Run')}
        </button>
      );
    case 'charging':
      return (
        <button {...commonProps} disabled>
          <FontAwesomeIcon className="mr-2" icon="spinner" pulse />
          {i18next.t('Charging...')}
        </button>
      );
    case 'checking':
      return (
        <button {...commonProps} disabled>
          <FontAwesomeIcon className="mr-2" icon="spinner" pulse />
          {i18next.t('Running...')}
        </button>
      );
    case 'disabled':
      return (
        <button {...commonProps} disabled>
          <FontAwesomeIcon icon={['fas', 'play-circle']} className="mr-2 success" />
          {i18next.t('Run')}
        </button>
      );
    default: {
      dispatch(actions.setError(new Error('unnexpected check status')));
      return null;
    }
  }
}

interface DropdownItemProps {
  onSelect?: () => void;
  status: string;
}

function GiveUpButtonDropdownItem({ onSelect, status }: DropdownItemProps) {
  return (
    <Menu.Item
      key="giveUp"
      title={i18next.t('Give Up')}
      onClick={onSelect}
      disabled={status === 'disabled'}
      className="cb-dropdown-item"
    >
      <span className={status === 'disabled' ? 'text-muted' : 'text-danger'}>
        <FontAwesomeIcon icon={['far', 'flag']} className="mr-1" />
        {i18next.t('Give up')}
      </span>
    </Menu.Item>
  );
}

function ResetButtonDropDownItem({ onSelect, status }: DropdownItemProps) {
  return (
    <Menu.Item
      key="reset"
      title={i18next.t('Reset solution')}
      onClick={onSelect}
      disabled={status === 'disabled'}
      className="cb-dropdown-item"
    >
      <span className="text-white">
        <FontAwesomeIcon icon={['fas', 'sync']} className="mr-1" />
        {i18next.t('Reset solution')}
      </span>
    </Menu.Item>
  );
}

interface GameActionButtonsProps {
  currentEditorLangSlug: string;
  checkResult?: () => void;
  checkBtnStatus: string;
  resetBtnStatus: string;
  giveUpBtnStatus: string;
  showGiveUpBtn?: boolean;
}

function GameActionButtons({
  currentEditorLangSlug,
  checkResult,
  checkBtnStatus,
  resetBtnStatus,
  giveUpBtnStatus,
  showGiveUpBtn,
}: GameActionButtonsProps) {
  const dispatch = useDispatch<AppDispatch>();

  const [modalShowing, setModalShowing] = useState(false);

  const modalHide = () => {
    setModalShowing(false);
  };

  const modalShow = () => {
    setModalShowing(true);
  };

  const handleGiveUp = () => {
    modalHide();
    sendGiveUp();
  };

  const handleReset = () => {
    dispatch(resetTextToTemplateAndSend(currentEditorLangSlug));
  };

  const renderModal = () => (
    <Modal show={modalShowing} onHide={modalHide} contentClassName="cb-text">
      <Modal.Body className="text-center cb-bg-panel">
        {i18next.t('Are you sure you want to give up?')}
      </Modal.Body>
      <Modal.Footer className="mx-auto border-0">
        <Button onClick={handleGiveUp} color="red" radius="md">
          {i18next.t('Give up')}
        </Button>
        <Button onClick={modalHide} color="cbSecondary" radius="md">
          {i18next.t('Cancel')}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className="d-flex py-2" role="group" aria-label={i18next.t('Game actions')}>
      <CheckResultButton onClick={checkResult} status={checkBtnStatus} />
      <Menu>
        <Menu.Target>
          <Button color="cbSecondary" radius="md" className="mx-1" id="dropdown-actions">
            <FontAwesomeIcon icon="ellipsis-v" />
          </Button>
        </Menu.Target>

        <Menu.Dropdown className="h-auto cb-overflow-x-hidden cb-scrollable-menu-dropdown-chat cb-blur">
          <ResetButtonDropDownItem onSelect={handleReset} status={resetBtnStatus} />
          {showGiveUpBtn && (
            <GiveUpButtonDropdownItem onSelect={modalShow} status={giveUpBtnStatus} />
          )}
        </Menu.Dropdown>
      </Menu>
      {renderModal()}
    </div>
  );
}

export default GameActionButtons;
