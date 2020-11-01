import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';
import Select from 'react-select';
import LanguageIcon from './LanguageIcon';

const defaultLanguages = Gon.getAsset('langs');

const LangTitle = ({ slug, name, version }) => (
  <div className="d-inline-flex align-items-center">
    <LanguageIcon lang={slug} className="ml-1" />
    <span className="mx-1">{_.capitalize(name)}</span>
    <span>{version}</span>
  </div>
);

const LanguagePicker = ({
  languages, currentLangSlug, onChangeLang, disabled,
}) => {
  const customStyle = {
    menu: provided => ({
      ...provided,
      maxWidth: '220px',
      marginLeft: 0,
      paddingLeft: '0.5rem',
    }),
  };
  const langs = languages || defaultLanguages;
  const [[currentLang], otherLangs] = _.partition(langs, lang => lang.slug === currentLangSlug);

  const options = otherLangs.map(lang => ({ label: <LangTitle {...lang} />, value: lang.name }));
  const changeLang = ({ label: { props } }) => {
    onChangeLang(props.slug);
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
        className="col-12 col-xl-7 tutorial-LanguagePicker"
        defaultValue={defaultLang}
        onChange={changeLang}
        options={options}
      />
    </>
  );
};

LanguagePicker.propTypes = {
  currentLangSlug: PropTypes.string.isRequired,
  onChangeLang: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default LanguagePicker;
