import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';

const languages = Gon.getAsset('langs');

const getLangTitle = (lang) => {
  const icons = {
    js: 'icon-nodejs',
    ruby: 'icon-ruby',
    elixir: 'icon-elixir',
    haskell: 'icon-haskell',
    clojure: 'icon-clojure',
    python: 'icon-python',
    php: 'icon-php-alt',
    perl: 'icon-perl',
  };

  return (
    <span className={icons[lang.slug]}>
      {`\u00a0${_.capitalize(lang.name)} ${lang.version}`}
    </span>
  );
};

const LanguagePicker = ({ currentLangSlug, onChange, disabled }) => {
  const [[currentLang], otherLangs] = _.partition(
    languages,
    lang => lang.slug === currentLangSlug,
  );

  if (disabled) {
    return (
      <button
        className="btn btn-outline-secondary btn-sm"
        type="button"
        disabled
      >
        {getLangTitle(currentLang)}
      </button>
    );
  }

  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-secondary btn-sm dropdown-toggle"
        type="button"
        id="dropdownLangButton"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        {getLangTitle(currentLang)}
      </button>
      <div className="dropdown-menu" aria-labelledby="dropdownLangButton">
        {_.map(otherLangs, ({ slug, name, version }) => (
          <button
            type="button"
            className="dropdown-item"
            href="#"
            key={slug}
            onClick={() => { onChange(slug); }}
          >
            {getLangTitle({ slug, name, version })}
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
