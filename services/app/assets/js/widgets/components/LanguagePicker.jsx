import React, { useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';
import LanguageIcon from './LanguageIcon';

const defaultLanguages = Gon.getAsset('langs');

const LangTitle = ({ slug, name, version }) => (
  <div className="d-inline-flex align-items-center">
    <LanguageIcon lang={slug} />
    <span className="mx-1">{_.capitalize(name)}</span>
    <span>{version}</span>
  </div>
);
const LanguagePicker = ({
  languages, currentLangSlug, onChangeLang, disabled,
}) => {
  const langs = languages || defaultLanguages;
  const [[currentLang], otherLangs] = _.partition(langs, lang => lang.slug === currentLangSlug);
    const [langInput, setLangInput] = useState('');
    const handleInputChange = e => {
      setLangInput(e.target.value);
    };
    const filterLangs = langInput === '' ? otherLangs : otherLangs.filter(lang => {
      const a = lang.name.toLowerCase().split('');
      const b = langInput.toLowerCase().split('');
      const result = _.includes(lang.name.toLowerCase(), langInput.toLowerCase());
      console.log(a);
      console.log(b);
      return result;
    });
  if (disabled) {
    return (
      <button className="btn btn-sm" type="button" disabled>
        <LangTitle {...currentLang} />
      </button>
    );
  }

  return (
    <div className="dropdown">
      <button
        className="btn btn-sm border btn-light dropdown-toggle"
        type="button"
        id="dropdownLangButton"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <LangTitle {...currentLang} />
      </button>
      <div className="dropdown-menu cb-langs-dropdown" aria-labelledby="dropdownLangButton">
        <input
          type="text"
          name="langInput"
          className="w-75 ml-4"
          placeholder="search..."
          onChange={handleInputChange}
          value={langInput}
        />
        {_.map(filterLangs, ({ slug, name, version }) => (
          <button
            type="button"
            className="dropdown-item btn rounded-0"
            key={slug}
            onClick={() => {
              onChangeLang(slug);
            }}
          >
            <LangTitle slug={slug} name={name} version={version} />
          </button>
        ))}
      </div>
    </div>
  );
};

LanguagePicker.propTypes = {
  currentLangSlug: PropTypes.string.isRequired,
  onChangeLang: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default LanguagePicker;
