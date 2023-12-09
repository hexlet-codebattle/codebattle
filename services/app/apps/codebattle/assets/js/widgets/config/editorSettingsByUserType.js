import editorUserTypes from './editorUserTypes';

export const editorBtnStatuses = {
  enabled: 'enabled',
  disabled: 'disabled',
  checking: 'checking',
  charging: 'charging',
};

const defaultSettings = {
    editable: false,
    showControlBtns: false,
    checkBtnStatus: editorBtnStatuses.disabled,
    resetBtnStatus: editorBtnStatuses.disabled,
    langPickerStatus: editorBtnStatuses.disabled,
    giveUpBtnStatus: editorBtnStatuses.disabled,
    modeBtnsStatus: editorBtnStatuses.disabled,
};

export const editorSettingsByUserType = {
  [editorUserTypes.currentUser]: {
    editable: true,
    showControlBtns: true,
    checkBtnStatus: editorBtnStatuses.enabled,
    resetBtnStatus: editorBtnStatuses.enabled,
    giveUpBtnStatus: editorBtnStatuses.enabled,
    langPickerStatus: editorBtnStatuses.enabled,
    modeBtnsStatus: editorBtnStatuses.enabled,
  },
  [editorUserTypes.player]: defaultSettings,
  [editorUserTypes.opponent]: defaultSettings,
};
