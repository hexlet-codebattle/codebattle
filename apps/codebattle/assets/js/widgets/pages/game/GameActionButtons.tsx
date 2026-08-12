import React, { useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Flex, Menu } from '@mantine/core';
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

  if (
    status !== 'enabled' &&
    status !== 'charging' &&
    status !== 'checking' &&
    status !== 'disabled'
  ) {
    dispatch(actions.setError(new Error('unnexpected check status')));
    return null;
  }

  const isDisabled = status === 'charging' || status === 'checking' || status === 'disabled';
  const isSpinning = status === 'charging' || status === 'checking';
  const label =
    status === 'charging'
      ? i18next.t('Charging...')
      : status === 'checking'
        ? i18next.t('Running...')
        : i18next.t('Run');

  return (
    <Button
      variant="outline"
      color="cbSuccess"
      size="sm"
      radius="md"
      title={`${i18next.t('Check solution')}&#013;Ctrl + Enter`}
      data-guide-id="CheckResultButton"
      onClick={onClick}
      disabled={isDisabled}
      leftSection={
        <FontAwesomeIcon
          icon={isSpinning ? 'spinner' : ['fas', 'play-circle']}
          className={isSpinning ? undefined : 'success'}
          pulse={isSpinning}
        />
      }
    >
      {label}
    </Button>
  );
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
      <span
        style={{
          color:
            status === 'disabled' ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-red-6)',
        }}
      >
        <FontAwesomeIcon icon={['far', 'flag']} style={{ marginRight: '0.25rem' }} />
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
      <span style={{ color: 'white' }}>
        <FontAwesomeIcon icon={['fas', 'sync']} style={{ marginRight: '0.25rem' }} />
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
    <Modal show={modalShowing} onHide={modalHide}>
      <Modal.Body
        style={{
          textAlign: 'center',
          backgroundColor: 'var(--mantine-color-cbPanel-6)',
        }}
      >
        {i18next.t('Are you sure you want to give up?')}
      </Modal.Body>
      <Modal.Footer style={{ justifyContent: 'center', borderTop: 0 }}>
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
    <Flex py="sm" role="group" aria-label={i18next.t('Game actions')}>
      <CheckResultButton onClick={checkResult} status={checkBtnStatus} />
      <Menu>
        <Menu.Target>
          <Button color="cbSecondary" radius="md" mx="xs" id="dropdown-actions">
            <FontAwesomeIcon icon="ellipsis-v" />
          </Button>
        </Menu.Target>

        <Menu.Dropdown
          className="cb-overflow-x-hidden cb-scrollable-menu-dropdown-chat cb-blur"
          style={{ height: 'auto' }}
        >
          <ResetButtonDropDownItem onSelect={handleReset} status={resetBtnStatus} />
          {showGiveUpBtn && (
            <GiveUpButtonDropdownItem onSelect={modalShow} status={giveUpBtnStatus} />
          )}
        </Menu.Dropdown>
      </Menu>
      {renderModal()}
    </Flex>
  );
}

export default GameActionButtons;
