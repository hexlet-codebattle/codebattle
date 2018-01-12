import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Gon from 'Gon';

const languages = Gon.getAsset('langs');

const LangSelector = ({ currentLangSlug, onChange }) => {

const [[currentLang, ...other], otherLangs] = _.partition(languages, lang => lang.slug === currentLangSlug);
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
        {`${currentLang.name} (${currentLang.version})`}
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
            {`${name} (${version})`}
          </button>
        ))}
      </div>
    </div>
  );
};

LangSelector.propTypes = {
  currentLangSlug: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default LangSelector;
