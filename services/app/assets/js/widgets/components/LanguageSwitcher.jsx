import React, { useRef } from 'react';
import _ from 'lodash';
import LanguageIcon from './LanguageIcon';
import useHover from '../utils/useHover';

const LanguageSwitcher = ({ changeText, langInput, currentLang }) => {
    const inputRef = useRef(null);
    const handleFocus = () => inputRef.current.focus();
    const { slug, name, version } = currentLang;

    const langSwitcherBtn = (
      <div className="btn btn-md" type="button">
        <div className="d-inline-flex align-items-center">
          <LanguageIcon lang={slug} />
          <span className="mx-1">{_.capitalize(name)}</span>
          <span>{version}</span>
        </div>
      </div>
    );

    const langSwitcherInput = (
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

    const langSwitcher = hovered => (
      <button
        className="btn p-0"
        type="button"
        onFocus={handleFocus}
        id="dropdownLangButton"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        {hovered ? langSwitcherInput : langSwitcherBtn }
      </button>
    );
    const [hovered] = useHover(langSwitcher);
    return hovered;
};

export default LanguageSwitcher;
