import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import Select from 'react-select';
import Gon from 'gon';

import _ from 'lodash';
import * as selectors from '../selectors';
import LanguageIcon from './LanguageIcon';

const defaultLanguages = Gon.getAsset('langs');

  const customStyle = {
    control: provided => ({
      ...provided,
      height: '33px',
      minHeight: '31px',
      minWidth: '210px',
      borderRadius: 'unset',
      backgroundColor: 'hsl(0, 0%, 100%)',
    }),
    indicatorsContainer: provided => ({
      ...provided,
      height: '29px',
    }),
    clearIndicator: provided => ({
      ...provided,
      padding: '5px',
    }),
    dropdownIndicator: provided => ({
      ...provided,
      padding: '5px',
    }),
    input: provided => ({
      ...provided,
      height: '21px',
    }),
  };

const LangTitle = ({ slug, name, version }) => (
  <div className="d-inline-flex align-items-center">
    <LanguageIcon lang={slug} className="ml-1" />
    <span className="mx-1">{_.capitalize(name)}</span>
    <span>{version}</span>
  </div>
);

const LanguagePickerView = ({ changeLang, currentLangSlug, isDisabled }) => {
  const languages = useSelector(selectors.editorLangsSelector);

  const langs = languages || defaultLanguages;
  const [[currentLang], otherLangs] = useMemo(() => _.partition(langs, lang => lang.slug === currentLangSlug), [langs, currentLangSlug]);
  const options = useMemo(() => otherLangs.map(lang => ({ label: <LangTitle {...lang} />, value: lang.name })), [otherLangs]);
  const defaultLang = useMemo(() => ({ label: <LangTitle {...currentLang} /> }), [currentLang]);

  if (isDisabled) {
    return (
      <button className="btn btn-sm" type="button" disabled>
        <LangTitle {...currentLang} />
      </button>
    );
  }

  return (
    <>
      <Select
        styles={customStyle}
        className="guide-LanguagePicker"
        defaultValue={defaultLang}
        onChange={changeLang}
        options={options}
      />
    </>
);
};

export default LanguagePickerView;
