import React, { useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';
import LanguageIcon from './LanguageIcon';
import { changeCurrentLangAndSetTemplate } from '../middlewares/Game';
import GameContext from '../containers/GameContext';
import { replayerMachineStates } from '../machines/game';
import LanguagePickerView from './LanguagePickerView';

const LangTitle = ({ slug, name, version }) => (
  <div className="d-inline-flex align-items-center">
    <LanguageIcon lang={slug} className="ml-1" />
    <span className="mx-1">{_.capitalize(name)}</span>
    <span>{version}</span>
  </div>
);

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
