import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';
import { useHover } from 'react-use';
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
  const langs = languages || defaultLanguages;
  const inputRef = useRef(null);
  const [[currentLang], otherLangs] = _.partition(langs, lang => lang.slug === currentLangSlug);
  const filteredLangs = otherLangs.filter(l => _.includes(l.name.toLowerCase(), langInput));
  const filterLangs = langInput === ''
  ? otherLangs : filteredLangs;

  const handleFocus = () => inputRef.current.focus();

  const element = hovered => (
    <button
      className="btn p-0"
      type="button"
      onFocus={handleFocus}
      id="dropdownLangButton"
      data-toggle="dropdown"
      aria-haspopup="true"
      aria-expanded="false"
    >
      {hovered ? (
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
) : (
  <div className="btn btn-md" type="button">
    <LangTitle {...currentLang} />
  </div>
)}
    </button>
);
  const [hovered] = useHover(element);
  if (disabled) {
    return (
      <button className="btn btn-sm" type="button" disabled>
        <LangTitle {...currentLang} />
      </button>
    );
  }

return (
  <div className="dropdown col-7">
    {hovered}
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
};

export default LanguagePicker;
