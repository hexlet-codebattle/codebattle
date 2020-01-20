import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';
import LanguageIcon from './LanguageIcon';

const languages = Gon.getAsset('langs');

const LangTitle = ({ slug, name, version }) => (
  <div className="d-inline-flex align-items-center">
    <LanguageIcon lang={slug} />
    <span className="mx-1">{_.capitalize(name)}</span>
    <span>{version}</span>
  </div>
);

const LanguagePicker = ({ currentLangSlug, onChange, disabled }) => {
  const [[currentLang], otherLangs] = _.partition(
    languages,
    lang => lang.slug === currentLangSlug,
  );

  if (disabled) {
    return (
      <button
        className="btn btn-sm"
        type="button"
        disabled
      >
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
      <div className="dropdown-menu" aria-labelledby="dropdownLangButton">
        {_.map(otherLangs, ({ slug, name, version }) => (
          <button
            type="button"
            className="dropdown-item btn rounded-0"
            key={slug}
            onClick={() => { onChange(slug); }}
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
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default LanguagePicker;
