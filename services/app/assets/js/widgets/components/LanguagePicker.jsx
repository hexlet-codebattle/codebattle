import React, { useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';
import Gon from 'gon';
import Select from 'react-select';
import LanguageIcon from './LanguageIcon';
import * as selectors from '../selectors';
import { changeCurrentLangAndSetTemplate } from '../middlewares/Game';
import GameContext from '../containers/GameContext';
import { replayerMachineStates } from '../machines/game';

const defaultLanguages = Gon.getAsset('langs');

const LangTitle = ({ slug, name, version }) => (
  <div className="d-inline-flex align-items-center">
    <LanguageIcon lang={slug} className="ml-1" />
    <span className="mx-1">{_.capitalize(name)}</span>
    <span>{version}</span>
  </div>
);

const LanguagePicker = ({ status, editor: { currentLangSlug } }) => {
  const customStyle = {
    control: provided => ({
      ...provided,
      height: '33px',
      minHeight: '31px',
      minWidth: '210px',
      borderRadius: 'unset',
      backgroundColor: 'hsl(0, 0%, 100%)',
    }),
    indicatorsContainer: provided => ({
      ...provided,
      height: '29px',
    }),
    clearIndicator: provided => ({
      ...provided,
      padding: '5px',
    }),
    dropdownIndicator: provided => ({
      ...provided,
      padding: '5px',
    }),
    input: provided => ({
      ...provided,
      height: '21px',
    }),
  };

  const dispatch = useDispatch();

  const { current: gameCurrent } = useContext(GameContext);
  const languages = useSelector(selectors.editorLangsSelector);

  const langs = languages || defaultLanguages;
  const [[currentLang], otherLangs] = _.partition(langs, lang => lang.slug === currentLangSlug);

  const options = otherLangs.map(lang => ({ label: <LangTitle {...lang} />, value: lang.name }));
  const changeLang = ({ label: { props } }) => {
    dispatch(changeCurrentLangAndSetTemplate(props.slug));
  };

  const defaultLang = { label: <LangTitle {...currentLang} /> };

  if (gameCurrent.matches({ replayer: replayerMachineStates.on }) || status === 'disabled') {
    return (
      <button className="btn btn-sm" type="button" disabled>
        <LangTitle {...currentLang} />
      </button>
    );
  }

  return (
    <>
      <Select
        styles={customStyle}
        className="guide-LanguagePicker"
        defaultValue={defaultLang}
        onChange={changeLang}
        options={options}
      />
    </>
  );
};

export default LanguagePicker;
