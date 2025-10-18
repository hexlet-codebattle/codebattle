import React, { useMemo } from 'react';

import capitalize from 'lodash/capitalize';
import partition from 'lodash/partition';
import { useSelector } from 'react-redux';
import Select from 'react-select';

import * as selectors from '../selectors';

import LanguageIcon from './LanguageIcon';

export const customStyle = {
  control: provided => ({
    ...provided,
    color: 'white',
    height: '33px',
    minHeight: '31px',
    minWidth: '210px',
    borderRadius: '0.3rem',
    backgroundColor: '#2a2a35',
    borderColor: '#3a3f50',

    ':hover': {
      borderColor: '#4c4c5a',
    },
  }),
  singleValue: provider => ({
    ...provider,
    color: 'white',
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
    color: 'white',
    padding: '5px',
  }),
  input: provided => ({
    ...provided,
    color: 'white',
    height: '21px',
  }),
  menu: provided => ({
    ...provided,
    color: 'white',
    backgroundColor: '#2a2a35',
  }),
  option: provided => ({
    ...provided,
    color: 'white',
    backgroundColor: '#2a2a35',
    ':hover': {
      backgroundColor: '#3a3f50',
    },
    ':focus': {
      backgroundColor: '#3a3f50',
    },
    ':active': {
      backgroundColor: '#3a3f50',
    },
  }),
};

const LangTitle = ({ slug, name, version }) => (
  <div translate="no" className="d-inline-flex align-items-center text-nowrap">
    <LanguageIcon lang={slug} className="ml-1" />
    <span className="text-white mx-1">{capitalize(name)}</span>
    <span className="text-white">{version}</span>
  </div>
);

function LanguagePickerView({ changeLang, currentLangSlug, isDisabled }) {
  const langs = useSelector(selectors.editorLangsSelector);

  const [[currentLang], otherLangs] = useMemo(
    () => partition(langs, lang => lang.slug === currentLangSlug),
    [langs, currentLangSlug],
  );
  const options = useMemo(
    () => otherLangs.map(lang => ({
      label: <LangTitle {...lang} />,
      value: lang.name,
    })),
    [otherLangs],
  );
  const defaultLang = useMemo(
    () => ({ label: <LangTitle {...currentLang} /> }),
    [currentLang],
  );

  if (isDisabled || options.length < 2) {
    return (
      <button className="btn btn-sm p-2" type="button" disabled>
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
}

export default LanguagePickerView;
