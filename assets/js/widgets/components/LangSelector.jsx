import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import languages from '../config/languages';

const LangSelector = ({ currentLangKey, onChange }) => {
  const options = _.filter(_.keys(languages), key => key !== currentLangKey);
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
        {languages[currentLangKey]}
      </button>
      <div className="dropdown-menu" aria-labelledby="dropdownLangButton">
        {_.map(options, langKey => (
          <button
            className="dropdown-item"
            href="#"
            key={langKey}
            onClick={() => {
              onChange(langKey);
            }}
          >
            {languages[langKey]}
          </button>
        ))}
      </div>
    </div>
  );
};

LangSelector.propTypes = {
  currentLangKey: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default LangSelector;
