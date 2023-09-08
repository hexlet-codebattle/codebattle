import React, { useMemo } from 'react';

import Gon from 'gon';
import capitalize from 'lodash/capitalize';
import partition from 'lodash/partition';
import { useSelector } from 'react-redux';
import Select from 'react-select';

import * as selectors from '../selectors';

import LanguageIcon from './LanguageIcon';

const defaultLanguages = Gon.getAsset('langs');

const customStyle = {
  control: (provided) => ({
    ...provided,
    height: '33px',
    minHeight: '31px',
    minWidth: '210px',
    borderRadius: '0.3rem',
    backgroundColor: 'hsl(0, 0%, 100%)',
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    height: '29px',
  }),
  clearIndicator: (provided) => ({
    ...provided,
    padding: '5px',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '5px',
  }),
  input: (provided) => ({
    ...provided,
    height: '21px',
  }),
};

function LangTitle({ name, slug, version }) {
  return (
    <div className="d-inline-flex align-items-center text-nowrap">
      <LanguageIcon className="ml-1" lang={slug} />
      <span className="mx-1">{capitalize(name)}</span>
      <span>{version}</span>
    </div>
  );
}

function LanguagePickerView({ changeLang, currentLangSlug, isDisabled }) {
  const languages = useSelector(selectors.editorLangsSelector);

  const langs = languages || defaultLanguages;
  const [[currentLang], otherLangs] = useMemo(
    () => partition(langs, (lang) => lang.slug === currentLangSlug),
    [langs, currentLangSlug],
  );
  const options = useMemo(
    () => otherLangs.map((lang) => ({ label: <LangTitle {...lang} />, value: lang.name })),
    [otherLangs],
  );
  const defaultLang = useMemo(() => ({ label: <LangTitle {...currentLang} /> }), [currentLang]);

  if (isDisabled) {
    return (
      <button disabled className="btn btn-sm" type="button">
        <LangTitle {...currentLang} />
      </button>
    );
  }

  return (
    <Select
      className="guide-LanguagePicker"
      defaultValue={defaultLang}
      options={options}
      styles={customStyle}
      onChange={changeLang}
    />
  );
}

export default LanguagePickerView;
