import React, { useMemo, type ReactNode } from 'react';

import capitalize from 'lodash/capitalize';
import { useSelector } from 'react-redux';

import { Box, Button, Flex, Text } from '@mantine/core';

import * as selectors from '../selectors';

import CbSelect from './CbSelect';
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

function LangTitle({ slug, name, version }: Language) {
  return (
    <Flex
      translate="no"
      display="inline-flex"
      align="center"
      style={{ whiteSpace: 'nowrap' }}
      gap="xs"
    >
      <Box ml="xs">
        <LanguageIcon lang={slug} />
      </Box>
      <Text c="white">{capitalize(name)}</Text>
      <Text c="white">{version}</Text>
    </Flex>
  );
}

const renderLangTitle = (lang: Language) => <LangTitle {...lang} />;

interface LanguagePickerViewProps {
  changeLang: (option: LangOption | null) => void;
  currentLangSlug: string;
  isDisabled?: boolean;
}

function LanguagePickerView({ changeLang, currentLangSlug, isDisabled }: LanguagePickerViewProps) {
  const allLangs = useSelector(selectors.editorLangsSelector) as Language[];
  // Kotlin temporarily hidden — image runs but support is incomplete
  const langs = useMemo(() => allLangs.filter((lang) => lang.slug !== 'kotlin'), [allLangs]);

  const currentLang = useMemo(
    () =>
      allLangs.find((lang) => lang.slug === currentLangSlug) || {
        slug: currentLangSlug,
        name: currentLangSlug,
      },
    [allLangs, currentLangSlug],
  );
  const otherLangs = useMemo(
    () => langs.filter((lang) => lang.slug !== currentLangSlug),
    [langs, currentLangSlug],
  );

  if (isDisabled || otherLangs.length < 2) {
    return (
      <Button size="sm" p="sm" disabled variant="default">
        <LangTitle {...currentLang} />
      </Button>
    );
  }

  return (
    <CbSelect<Language>
      value={currentLang}
      onChange={(lang) => lang && changeLang({ slug: lang.slug, label: renderLangTitle(lang) })}
      options={otherLangs}
      getOptionValue={(lang) => lang.slug}
      getOptionLabel={renderLangTitle}
      searchable={false}
      w={210}
      classNames={{ target: 'guide-LanguagePicker' }}
    />
  );
}

export default LanguagePickerView;
