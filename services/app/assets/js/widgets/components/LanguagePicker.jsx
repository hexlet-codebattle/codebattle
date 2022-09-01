import React, { useContext } from 'react';
import { useDispatch } from 'react-redux';
import { changeCurrentLangAndSetTemplate } from '../middlewares/Game';
import GameContext from '../containers/GameContext';
import { replayerMachineStates } from '../machines/game';
import LanguagePickerView from './LanguagePickerView';

const LanguagePicker = ({ status, editor: { currentLangSlug } }) => {
  const dispatch = useDispatch();

  const { current: gameCurrent } = useContext(GameContext);
  const changeLang = ({ label: { props } }) => {
    dispatch(changeCurrentLangAndSetTemplate(props.slug));
  };

  return (
    <LanguagePickerView
      isDisabled={gameCurrent.matches({ replayer: replayerMachineStates.on }) || status === 'disabled'}
      currentLangSlug={currentLangSlug}
      changeLang={changeLang}
    />
  );
};

export default LanguagePicker;
