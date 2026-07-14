import React, { useMemo, type ReactNode } from 'react';

import capitalize from 'lodash/capitalize';
import partition from 'lodash/partition';
import { useSelector } from 'react-redux';
import Select, { type StylesConfig } from 'react-select';

import * as selectors from '../selectors';

import LanguageIcon from './LanguageIcon';

interface Language {
  slug: string;
  name: string;
  version?: string;
}

export interface LangOption {
  label: ReactNode;
  value?: string;
  slug: string;
}

export const customStyle: StylesConfig<LangOption, false> = {
  control: (provided) => ({
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
  singleValue: (provider) => ({
    ...provider,
    color: 'white',
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
    color: 'white',
    padding: '5px',
  }),
  input: (provided) => ({
    ...provided,
    color: 'white',
    height: '21px',
  }),
  menu: (provided) => ({
    ...provided,
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, .3)',
    backdropFilter: 'blur(16px)',
  }),
  option: (provided) => ({
    ...provided,
    color: 'white',
    backgroundColor: 'transparent',

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

function LangTitle({ slug, name, version }: Language) {
  return (
    <div translate="no" className="d-inline-flex align-items-center text-nowrap">
      <LanguageIcon lang={slug} className="ml-1" />
      <span className="text-white mx-1">{capitalize(name)}</span>
      <span className="text-white">{version}</span>
    </div>
  );
}

interface LanguagePickerViewProps {
  changeLang: (option: LangOption | null) => void;
  currentLangSlug: string;
  isDisabled?: boolean;
}

function LanguagePickerView({ changeLang, currentLangSlug, isDisabled }: LanguagePickerViewProps) {
  const allLangs = useSelector(selectors.editorLangsSelector) as Language[];
  // Kotlin temporarily hidden — image runs but support is incomplete
  const langs = useMemo(() => allLangs.filter((lang) => lang.slug !== 'kotlin'), [allLangs]);

  const [[currentLang], otherLangs] = useMemo(
    () => partition(langs, (lang) => lang.slug === currentLangSlug),
    [langs, currentLangSlug],
  );
  const options = useMemo(
    () =>
      otherLangs.map((lang) => ({
        label: <LangTitle {...lang} />,
        value: lang.name,
        slug: lang.slug,
      })),
    [otherLangs],
  );
  const defaultLang = useMemo(
    () => ({ label: <LangTitle {...currentLang} />, slug: currentLang.slug }),
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
    <Select
      styles={customStyle}
      className="guide-LanguagePicker"
      defaultValue={defaultLang}
      onChange={changeLang}
      options={options}
    />
  );
}

export default LanguagePickerView;
