import MonacoEditor from '@monaco-editor/react';
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Flex, Group, Paper, Text, UnstyledButton } from '@mantine/core';
import i18n from '../../../i18n';
import languages from '../../config/languages';
import useEditor from '../../utils/useEditor';
import { type Lang } from './types';

interface EditorPanelProps {
  text?: string;
  lang?: string;
  editorFullscreen?: boolean;
  setEditorFullscreen: (value: boolean) => void;
  editable?: boolean;
  onSubmit?: (draft: string, lang: string) => Promise<unknown> | void;
  langs?: Lang[];
  currentLang?: string;
  inlineHidden?: boolean;
}

function EditorPanel({
  text,
  lang,
  editorFullscreen,
  setEditorFullscreen,
  editable = false,
  onSubmit,
  langs = [],
  currentLang,
  inlineHidden = false,
}: EditorPanelProps) {
  const [selectedLang, setSelectedLang] = useState(currentLang || lang || 'js');
  const [draft, setDraft] = useState(text || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(text || '');
  }, [text]);

  useEffect(() => {
    if (lang) {
      setSelectedLang(lang);
    } else if (editable && currentLang) {
      setSelectedLang(currentLang);
    }
  }, [lang, currentLang, editable]);

  const displayLang = editable ? selectedLang : lang;
  const mappedSyntax = displayLang
    ? (languages as Record<string, string>)[displayLang] || displayLang
    : 'javascript';

  const editorProps = {
    wordWrap: 'on',
    placeholder: '',
    lineNumbers: (editable ? draft : text) ? 'on' : 'off',
    fontSize: 14,
    editable,
    renderLineHighlight: editable ? 'line' : 'none',
    hideCursorInOverviewRuler: !editable,
    overviewRulerBorder: false,
    roomMode: 'group_tournament',
    checkResult: () => {},
    toggleMuteSound: () => {},
    mute: false,
    userType: editable ? 'player' : 'spectator',
    userId: 0,
    onChangeCursorSelection: () => {},
    onChangeCursorPosition: () => {},
    syntax: mappedSyntax,
    gameStartTimeMs: 0,
    onTelemetryEvent: () => {},
    loading: false,
    canSendCursor: false,
    allowClipboard: editable,
  };

  const { options, handleEditorWillMount, handleEditorDidMount } = useEditor(editorProps);

  const langOptions = useMemo(
    () =>
      (langs || []).map((l) => ({
        slug: l.slug,
        label: `${l.name}${l.version ? ` ${l.version}` : ''}`,
      })),
    [langs],
  );

  const handleSubmit = async () => {
    if (!onSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(draft, selectedLang);
    } catch (err) {
      const error = err as { reason?: string; message?: string } | null;
      setSubmitError(error?.reason || error?.message || 'submit_failed');
    } finally {
      setSubmitting(false);
    }
  };

  const titleText = editable
    ? ''
    : `${i18n.t('Solution')}${displayLang ? ` — ${displayLang}` : ''}`;

  const langSelector = editable && langOptions.length > 0 && (
    <select
      value={selectedLang}
      onChange={(e) => setSelectedLang(e.target.value)}
      disabled={submitting}
      style={{
        backgroundColor: '#2a2a35',
        color: '#fff',
        border: '1px solid #3a3f50',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.875rem',
        marginLeft: 8,
      }}
    >
      {langOptions.map((opt) => (
        <option
          key={opt.slug}
          value={opt.slug}
          style={{ backgroundColor: '#2a2a35', color: '#fff' }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  );

  const editor = (
    <MonacoEditor
      theme="vs-dark"
      language={mappedSyntax}
      value={editable ? draft : text || ''}
      // useEditor returns plain string values (e.g. wordWrap) that don't match
      // Monaco's literal-union option types; cast at this third-party boundary.
      options={options as React.ComponentProps<typeof MonacoEditor>['options']}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      onChange={editable ? (value) => setDraft(value ?? '') : undefined}
      width="100%"
      height="100%"
    />
  );

  const panelBorder = { borderBottom: '1px solid var(--mantine-color-default-border)' };

  const submitButton = editable && (
    <Button
      size="compact-sm"
      color="cbSuccess"
      mr="sm"
      onClick={handleSubmit}
      disabled={submitting || !draft || !selectedLang}
    >
      {submitting ? i18n.t('Sending...') : i18n.t('Submit')}
    </Button>
  );

  return (
    <>
      {!inlineHidden && (
        <Paper withBorder radius="md" shadow="sm" bg="transparent">
          <Group
            justify="space-between"
            align="center"
            px="md"
            py="sm"
            className="cb-bg-highlight-panel"
            style={panelBorder}
          >
            <Group gap="xs" align="center" c="white">
              <Text size="sm">{titleText}</Text>
              {langSelector}
            </Group>
            <Group gap="xs" align="center">
              {submitButton}
              <UnstyledButton
                c="white"
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setEditorFullscreen(true)}
              >
                {i18n.t('Fullscreen')}
              </UnstyledButton>
            </Group>
          </Group>
          <Box style={{ height: '80vh' }}>{editor}</Box>
          {editable && submitError && (
            <Box
              px="md"
              py="sm"
              className="cb-bg-highlight-panel"
              style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
            >
              <Text size="sm" c="red">
                {submitError}
              </Text>
            </Box>
          )}
        </Paper>
      )}

      {editorFullscreen && (
        <Flex
          pos="fixed"
          direction="column"
          style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050, background: '#1e1e1e' }}
        >
          <Flex
            justify="space-between"
            align="center"
            px="md"
            py="sm"
            style={{ background: '#252526' }}
          >
            <Flex align="center" c="white" gap="xs">
              <Text size="sm" fw={600}>
                {titleText}
              </Text>
              {langSelector}
            </Flex>
            <Flex align="center">
              {submitButton}
              <Button
                size="compact-sm"
                variant="default"
                onClick={() => setEditorFullscreen(false)}
              >
                {i18n.t('Close')}
              </Button>
            </Flex>
          </Flex>
          <Box style={{ flexGrow: 1 }}>{editor}</Box>
        </Flex>
      )}
    </>
  );
}

export default EditorPanel;
