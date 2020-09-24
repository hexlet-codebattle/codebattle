import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';
import LanguageIcon from './LanguageIcon';
import LanguageSwitcher from './LanguageSwitcher';

const defaultLanguages = Gon.getAsset('langs');

export const LangTitle = ({ slug, name, version }) => (
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

return (
  <div className="dropdown col-7">
    <LanguageSwitcher changeText={changeText} langInput={langInput} currentLang={currentLang} />
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
