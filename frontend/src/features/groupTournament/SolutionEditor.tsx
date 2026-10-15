import { Alert, Button, Group, Modal, Select, Text } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeEditor } from '@/features/game/editor/CodeEditor';
import { LangIcon } from '@/shared/LangIcon';

import type { Lang } from './types';
import classes from './GroupTournament.module.css';

const submitErrorText = (reason: string, t: (key: string) => string) => {
  switch (reason) {
    case 'lang_required':
      return t('Choose a language');
    case 'external_platform_only':
      return t('Solutions are submitted on the external platform');
    case 'timeout':
      return t('The server did not respond, try again');
    default:
      return `${t('Could not submit the solution')} (${reason})`;
  }
};

interface SolutionEditorProps {
  opened: boolean;
  onClose: () => void;
  /** The selected run's code and language: the draft starts from it. */
  code: string;
  lang: string | null;
  langs: Lang[];
  onSubmit: (solution: string, lang: string) => Promise<unknown>;
  /** After a successful submit. */
  onSubmitted: () => void;
}

/** Full-screen editor: language, code, Submit (Ctrl/Cmd+Enter). */
export function SolutionEditor({ opened, onClose, code, lang, langs, onSubmit, onSubmitted }: SolutionEditorProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(code);
  const [selectedLang, setSelectedLang] = useState(lang || langs[0]?.slug || 'js');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A different run picked (or my new run loaded): start from its code.
  const [source, setSource] = useState({ code, lang });
  if (source.code !== code || source.lang !== lang) {
    setSource({ code, lang });
    if (source.code !== code) setDraft(code);
    if (lang && source.lang !== lang) setSelectedLang(lang);
  }

  const submit = async () => {
    if (submitting || !draft.trim() || !selectedLang) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(draft, selectedLang);
      onSubmitted();
    } catch (reason) {
      const value = reason as { reason?: string; message?: string } | null;
      setError(submitErrorText(value?.reason || value?.message || 'submit_failed', t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      classNames={{ content: classes.fullscreenContent, body: classes.fullscreenBody, header: classes.editorHeader }}
      title={
        <Group gap="sm" wrap="nowrap">
          <Select
            size="xs"
            w={220}
            aria-label={t('Language')}
            value={selectedLang}
            onChange={(value) => value && setSelectedLang(value)}
            disabled={submitting}
            allowDeselect={false}
            searchable
            leftSection={<LangIcon lang={selectedLang} withTooltip={false} />}
            data={langs.map((item) => ({ value: item.slug, label: `${item.name}${item.version ? ` ${item.version}` : ''}` }))}
            renderOption={({ option }) => (
              <Group gap={8} wrap="nowrap">
                <LangIcon lang={option.value} withTooltip={false} />
                <Text size="xs">{option.label}</Text>
              </Group>
            )}
          />
          <Button size="xs" color="green" leftSection={<IconSend size={14} />} loading={submitting} disabled={!draft.trim()} onClick={submit}>
            {t('Submit')}
          </Button>
        </Group>
      }
    >
      {error && (
        <Alert color="red" p={6} radius={0} onClose={() => setError(null)} withCloseButton>
          <Text size="sm">{error}</Text>
        </Alert>
      )}
      {opened && <CodeEditor value={draft} lang={selectedLang} onChange={setDraft} onRun={submit} allowClipboard />}
    </Modal>
  );
}
