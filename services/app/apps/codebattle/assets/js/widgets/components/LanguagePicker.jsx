import React, { useContext } from 'react';

import { useDispatch } from 'react-redux';

import { inTestingRoomSelector, openedReplayerSelector } from '../machines/selectors';
import { sendCurrentLangAndSetTemplate, updateCurrentLangAndSetTemplate } from '../middlewares/Game';
import useMachineStateSelector from '../utils/useMachineStateSelector';

import LanguagePickerView from './LanguagePickerView';
import RoomContext from './RoomContext';

function LanguagePicker({ status, editor }) {
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const isOpenedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);
  const isTestingRoom = useMachineStateSelector(mainService, inTestingRoomSelector);
  const changeLang = ({ label: { props } }) => {
    if (isTestingRoom) {
      dispatch(updateCurrentLangAndSetTemplate(props.slug));
    } else {
      dispatch(sendCurrentLangAndSetTemplate(props.slug));
    }
  };

  return (
    <LanguagePickerView
      isDisabled={isOpenedReplayer || status === 'disabled'}
      currentLangSlug={editor?.currentLangSlug || 'js'}
      changeLang={changeLang}
    />
  );
}

export default LanguagePicker;
