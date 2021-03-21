import editorUserTypes from './editorUserTypes';

const defaultSettings = {
    editable: false,
    showControlBtns: false,
    checkBtnStatus: 'disabled',
    resetBtnStatus: 'disabled',
    langPickerStatus: 'disabled',
    giveUpBtnStatus: 'disabled',
    modeBtnsStatus: 'disabled',
};

export default {
  [editorUserTypes.currentUser]: {
    editable: true,
    showControlBtns: true,
    checkBtnStatus: 'enabled',
    resetBtnStatus: 'enabled',
    giveUpBtnStatus: 'enabled',
    langPickerStatus: 'enabled',
    modeBtnsStatus: 'enabled',
  },
  [editorUserTypes.player]: defaultSettings,
  [editorUserTypes.opponent]: defaultSettings,
};
