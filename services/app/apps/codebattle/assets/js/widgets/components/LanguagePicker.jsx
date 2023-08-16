import React, { useContext } from 'react';
import { useDispatch } from 'react-redux';
import { sendCurrentLangAndSetTemplate, updateCurrentLangAndSetTemplate } from '../middlewares/Game';
import RoomContext from './RoomContext';
import LanguagePickerView from './LanguagePickerView';
import { inTestingRoomSelector, openedReplayerSelector } from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';

function LanguagePicker({ status, editor: { currentLangSlug } }) {
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
      currentLangSlug={currentLangSlug}
      changeLang={changeLang}
    />
  );
}

export default LanguagePicker;
