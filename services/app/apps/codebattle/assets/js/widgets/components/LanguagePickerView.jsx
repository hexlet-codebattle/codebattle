import React, { useMemo } from 'react';

import capitalize from 'lodash/capitalize';
import partition from 'lodash/partition';
import { useSelector } from 'react-redux';
import Select from 'react-select';

import * as selectors from '../selectors';

import LanguageIcon from './LanguageIcon';

const customStyle = {
  control: provided => ({
    ...provided,
    height: '33px',
    minHeight: '31px',
    minWidth: '210px',
    borderRadius: '0.3rem',
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
  <div className="d-inline-flex align-items-center text-nowrap">
    <LanguageIcon lang={slug} className="ml-1" />
    <span className="mx-1">{capitalize(name)}</span>
    <span>{version}</span>
  </div>
);

function LanguagePickerView({ changeLang, currentLangSlug, isDisabled }) {
  const languages = useSelector(selectors.editorLangsSelector);

  const langs = languages;
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
}

export default LanguagePickerView;
