import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';
import Select from 'react-select';
import LanguageIcon from './LanguageIcon';
import * as selectors from '../selectors';
import { changeCurrentLangAndSetTemplate } from '../middlewares/Game';

const defaultLanguages = Gon.getAsset('langs');

const LangTitle = ({ slug, name, version }) => (
  <div className="d-inline-flex align-items-center">
    <LanguageIcon lang={slug} className="ml-1" />
    <span className="mx-1">{_.capitalize(name)}</span>
    <span>{version}</span>
  </div>
);

const LanguagePicker = ({ disabled, editor: { currentLangSlug } }) => {
  const customStyle = {
    control: provided => ({
      ...provided,
      height: '31px',
      minHeight: '31px',
      minWidth: '190px',
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

  const languages = useSelector(state => selectors.editorLangsSelector(state));

  const langs = languages || defaultLanguages;
  const [[currentLang], otherLangs] = _.partition(langs, lang => lang.slug === currentLangSlug);

  const options = otherLangs.map(lang => ({ label: <LangTitle {...lang} />, value: lang.name }));
  const changeLang = ({ label: { props } }) => {
    dispatch(changeCurrentLangAndSetTemplate(props.slug));
  };

  const defaultLang = { label: <LangTitle {...currentLang} /> };

  if (disabled) {
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
        className="mx-1 guide-LanguagePicker"
        defaultValue={defaultLang}
        onChange={changeLang}
        options={options}
      />
    </>
  );
};

LanguagePicker.propTypes = {
  disabled: PropTypes.bool.isRequired,
};

export default LanguagePicker;
