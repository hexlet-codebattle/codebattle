import React, { useRef } from 'react';
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
  languages, currentLangSlug, onChangeLang, disabled, langInput, changeText,
}) => {
  const inputRef = useRef(null);
  const langs = languages || defaultLanguages;
  const [[currentLang], otherLangs] = _.partition(langs, lang => lang.slug === currentLangSlug);
  const filteredLangs = otherLangs.filter(l => _.includes(l.name.toLowerCase(), langInput));
  const filterLangs = langInput === ''
  ? otherLangs : filteredLangs;
  const handleFocus = () => inputRef.current.focus();

  if (disabled) {
    return (
      <button className="btn btn-sm" type="button" disabled>
        <LangTitle {...currentLang} />
      </button>
    );
  }

  const LangSwitchInput = (
    <input
      type="text"
      name="langInput"
      className="form-control input-text dropdown-item"
      placeholder={_.capitalize(currentLang.name)}
      onChange={changeText}
      ref={inputRef}
      value={langInput}
    />
  );

  return (
    <div className="dropdown col-7">
      <div
        className="btn p-0 btn-group"
        type="button"
        id="dropdownLangButton"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <button
          type="button"
          className="btn btn-md dropdown-toggle"
          onClick={handleFocus}
        >
          <LangTitle {...currentLang} />
        </button>
      </div>
      <div className="dropdown-menu cb-langs-dropdown px-1" aria-labelledby="dropdownLangButton">
        {LangSwitchInput}
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
