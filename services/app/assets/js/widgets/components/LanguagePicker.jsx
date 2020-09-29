import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';
import useHover from '../utils/useHover';
import LanguageIcon from './LanguageIcon';

const defaultLanguages = Gon.getAsset('langs');
const LangTitle = ({ slug, name, version }) => (
  <div className="d-inline-flex align-items-center">
    <LanguageIcon lang={slug} />
    <span className="mx-1">{_.capitalize(name)}</span>
    <span>{version}</span>
  </div>
);
const LangSwitcher = (first, second, refs) => {
  // const inputRef = useRef(null);
  const handleFocus = () => refs.current.focus();

  const ButtonToggler = hovered => (
    <button
      className="btn p-0"
      type="button"
      onFocus={handleFocus}
      id="dropdownLangButton"
      data-toggle="dropdown"
      aria-haspopup="true"
      aria-expanded="false"
    >
      {hovered ? first : second}
    </button>
);
  const [hovered] = useHover(ButtonToggler);
  return hovered;
};

const LanguagePicker = ({
  languages, currentLangSlug, onChangeLang, disabled, langInput, changeText,
}) => {
  const inputRef = useRef(null);

  const langs = languages || defaultLanguages;
  const [[currentLang], otherLangs] = _.partition(langs, lang => lang.slug === currentLangSlug);
  const filteredLangs = otherLangs.filter(l => _.includes(l.name.toLowerCase(), langInput));
  const filterLangs = langInput === ''
  ? otherLangs : filteredLangs;

  if (disabled) {
    return (
      <button className="btn btn-sm" type="button" disabled>
        <LangTitle {...currentLang} />
      </button>
    );
  }

  const LangSwitchBtn = (
    <button className="btn btn-md" type="button">
      <LangTitle {...currentLang} />
    </button>
  );

  const LangSwitchInput = (
    <input
      type="text"
      name="langInput"
      className="form-control input-text"
      ref={inputRef}
      placeholder={_.capitalize(currentLang.name)}
      onClick={e => e.stopPropagation()}
      onChange={changeText}
      value={langInput}
    />
  );
  const langPicker = LangSwitcher(LangSwitchInput, LangSwitchBtn, inputRef);

  return (
    <div className="dropdown col-7">
      {langPicker}
      <div className="dropdown-menu cb-langs-dropdown" aria-labelledby="dropdownLangButton">

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
  langInput: PropTypes.string.isRequired,
};

export default LanguagePicker;
