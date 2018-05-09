import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'gon';

const languages = Gon.getAsset('langs');
const getLangTitle = (lang) => {
  const icons = {
    js: 'icon-nodejs',
    php: 'icon-php-alt',
    ruby: 'icon-ruby',
    elixir: 'icon-elixir',
    python: 'icon-python',
  };

  return (<span className={icons[lang.slug]}>
    {lang.name} {lang.version}
          </span>
  );
};
const LangSelector = ({ currentLangSlug, onChange, disabled }) => {
  const [[currentLang, ...other], otherLangs] =
    _.partition(languages, lang => lang.slug === currentLangSlug);

  if (disabled) {
    return (
      <button
        className="btn btn-info"
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
        className="btn btn-info dropdown-toggle"
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
            className="dropdown-item"
            href="#"
            key={slug}
            onClick={() => {
              onChange(slug);
            }}
          >
            {getLangTitle({ slug, name, version })}
          </button>
        ))}
      </div>
    </div>
  );
};

LangSelector.propTypes = {
  currentLangSlug: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default LangSelector;
