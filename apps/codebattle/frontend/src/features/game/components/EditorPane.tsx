import { ActionIcon, Badge, Button, Combobox, Group, Kbd, Menu, Modal, Text, Tooltip, UnstyledButton, useCombobox } from '@mantine/core';
import {
  IconChevronDown,
  IconDotsVertical,
  IconFlag,
  IconKeyboard,
  IconPlayerPlayFilled,
  IconRestore,
} from '@tabler/icons-react';
import type { OnMount } from '@monaco-editor/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { UserCard } from '@/features/users/UserCard';
import { parseServerDate } from '@/shared/date';
import { useSharedProps } from '@/shared/useSharedProps';
import { LangIcon, langName } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import { CodeEditor } from '../editor/CodeEditor';
import { useEditorTelemetry } from '../editor/useEditorTelemetry';
import { useEditorPrefs } from '../editor/prefs';
import { isGameOver, useGameStore } from '../store';
import type { GameLang, GamePlayer } from '../types';
import type { GameApi } from '../useGame';
import classes from '../GameRoom.module.css';

import { EditorSettings } from './EditorSettings';
import { PlayerActions } from './PlayerActions';
import { TestsPill } from './TestsPill';


const RESULT_COLORS: Record<string, string> = { won: 'green', lost: 'red', gave_up: 'red', timeout: 'gray' };

function ResultBadge({ player }: { player: GamePlayer }) {
  const { t } = useTranslation();
  const labels: Record<string, string> = { won: t('Won'), lost: t('Lost'), gave_up: t('Gave up'), timeout: t('Timeout') };
  if (!labels[player.result]) return null;
  return (
    <Badge size="xs" variant="light" color={RESULT_COLORS[player.result]}>
      {labels[player.result]}
    </Badge>
  );
}

/** Name, rating and progress of the player whose editor this is. */
function PlayerChip({ player, onShowTests }: { player: GamePlayer; onShowTests?: () => void }) {
  const { t } = useTranslation();

  return (
    <Group gap={8} wrap="nowrap" miw={0} className={classes.playerChip}>
      <UserAvatar user={player} size={22} />
      <UserCard user={player}>
        <Text span size="sm" fw={700} c="bright" truncate>
          {player.name}
        </Text>
      </UserCard>
      {player.rating != null && !player.is_bot && (
        <Tooltip label={t('Elo rating')}>
          <Text span size="xs" c="dimmed" ff="monospace">
            {player.rating}
            {player.rating_diff ? (
              <Text span inherit c={player.rating_diff > 0 ? 'green' : 'red'}>
                {' '}
                {player.rating_diff > 0 ? '+' : ''}
                {player.rating_diff}
              </Text>
            ) : null}
          </Text>
        </Tooltip>
      )}
      <ResultBadge player={player} />
      <TestsPill playerId={player.id} onOpen={onShowTests} />
    </Group>
  );
}

/** A compact language picker: icon + name, searchable list. */
function LangPicker({ langs, value, onChange, disabled }: { langs: GameLang[]; value: string; onChange: (slug: string) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const current = langs.find((lang) => lang.slug === value);
  const sorted = [...langs].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Combobox store={combobox} onOptionSubmit={(slug) => { onChange(slug); combobox.closeDropdown(); }} width={220} position="bottom-start">
      <Combobox.Target>
        <UnstyledButton className={classes.langButton} onClick={() => combobox.toggleDropdown()} disabled={disabled} aria-label={t('Language')}>
          <LangIcon lang={value} size={15} withTooltip={false} />
          <Text span size="xs" fw={600}>
            {current ? `${langName(current.slug) || current.name}` : value}
          </Text>
          {current?.version && (
            <Text span size="xs" c="dimmed" visibleFrom="lg">
              {current.version}
            </Text>
          )}
          {!disabled && <IconChevronDown size={12} />}
        </UnstyledButton>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options mah={360} style={{ overflowY: 'auto' }}>
          {sorted.map((lang) => (
            <Combobox.Option key={lang.slug} value={lang.slug} active={lang.slug === value}>
              <Group gap={8} wrap="nowrap">
                <LangIcon lang={lang.slug} size={15} withTooltip={false} />
                <Text size="sm">{langName(lang.slug) || lang.name}</Text>
                <Text size="xs" c="dimmed" ml="auto">
                  {lang.version}
                </Text>
              </Group>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

interface EditorPaneProps {
  player: GamePlayer;
  /** My own editor while the game runs. */
  editable: boolean;
  /** Null in history mode (no channel). */
  api: GameApi | null;
  /** Opens the Tests tab (the left seat); otherwise the tests pill shows a popover. */
  onShowTests?: () => void;
  /** Shows the ⚙ editor settings (once per page: the left seat). */
  withSettings?: boolean;
  allowClipboard: boolean;
  /** Inside another frame (the broadcast arena): no own border; font/theme set by the host. */
  embedded?: boolean;
  fontSize?: number;
  theme?: string;
  onEditorMount?: OnMount;
}

export function EditorPane({
  player,
  editable,
  api,
  allowClipboard,
  onShowTests,
  withSettings = false,
  embedded = false,
  fontSize: fontSizeOverride,
  theme,
  onEditorMount,
}: EditorPaneProps) {
  const { t } = useTranslation();
  const editor = useGameStore((state) => state.editors[player.id]);
  const langs = useGameStore((state) => state.game?.langs ?? []);
  const over = useGameStore((state) => isGameOver(state.game?.state));
  const isTournament = useGameStore((state) => state.game?.tournament_id != null);
  const checking = useGameStore((state) => Boolean(state.checking[player.id]));
  const { vim, fontSize, update } = useEditorPrefs();
  // Drafts per language, so switching back restores what I wrote.
  const drafts = useRef<Record<string, string>>({});

  const text = editor?.text ?? '';
  const lang = editor?.lang ?? player.editor_lang;

  // Bot detection: my editor's keys and edits while the game is played (page flag on).
  const { editor_summary_enabled: summaryEnabled } = useSharedProps<{ editor_summary_enabled?: boolean }>();
  const gameState = useGameStore((state) => state.game?.state);
  const startsAt = useGameStore((state) => state.game?.starts_at);
  const telemetry = useEditorTelemetry({
    enabled: Boolean(summaryEnabled && editable && api && gameState === 'playing'),
    lang,
    startedAtMs: startsAt ? parseServerDate(startsAt).getTime() : Date.now(),
    send: (summary, summaryLang) => api?.sendEditorSummary(summary, summaryLang),
  });
  const template = (slug: string) => langs.find((item) => item.slug === slug)?.solution_template ?? '';

  const switchLang = (slug: string) => {
    if (slug === lang) return;
    drafts.current[lang] = text;
    api?.changeLang(slug, drafts.current[slug] ?? template(slug));
  };

  const [confirm, setConfirm] = useState<'reset' | 'give_up' | null>(null);
  const confirmCopy = {
    reset: {
      title: t('Reset the code?'),
      text: t('Your code in this language is replaced with the starting template.'),
      label: t('Reset'),
    },
    give_up: { title: t('Give up?'), text: t('The game ends and your opponent wins.'), label: t('Give up') },
  };
  const confirmed = () => {
    if (confirm === 'reset') api?.changeLang(lang, template(lang));
    if (confirm === 'give_up') api?.giveUp();
    setConfirm(null);
  };

  return (
    <section className={classes.pane} data-mine={editable || undefined} data-embedded={embedded || undefined}>
      <header className={classes.paneBar}>
        <PlayerChip player={player} onShowTests={onShowTests} />
        {!editable && <PlayerActions player={player} />}
        <Group gap={6} wrap="nowrap" className={classes.paneActions}>
          <LangPicker langs={langs} value={lang} onChange={switchLang} disabled={!editable} />
          {withSettings && <EditorSettings />}
          {editable && (
            <>
              <Tooltip label={vim ? t('Vim mode on') : t('Vim mode off')}>
                <ActionIcon
                  variant={vim ? 'light' : 'subtle'}
                  color={vim ? 'green' : 'gray'}
                  size="md"
                  onClick={() => update({ vim: !vim })}
                  aria-pressed={vim}
                  aria-label={t('Vim mode')}
                >
                  <IconKeyboard size={16} />
                </ActionIcon>
              </Tooltip>
              <Menu position="bottom-end" width={210}>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" size="md" aria-label={t('More')}>
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconRestore size={15} />} onClick={() => setConfirm('reset')}>
                    {t('Reset code')}
                  </Menu.Item>
                  {/* Tournament games can't be given up (Game.Fsm ignores it there), as in legacy. */}
                  {!over && !isTournament && (
                    <Menu.Item color="red" leftSection={<IconFlag size={15} />} onClick={() => setConfirm('give_up')}>
                      {t('Give up')}
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
              <Tooltip
                label={
                  <Group gap={4}>
                    {t('Run tests')} <Kbd size="xs">Ctrl/⌘</Kbd>+<Kbd size="xs">Enter</Kbd>
                  </Group>
                }
              >
                <Button size="compact-sm" color="green" variant="filled" loading={checking} leftSection={<IconPlayerPlayFilled size={13} />} onClick={api?.check}>
                  {t('Run')}
                </Button>
              </Tooltip>
            </>
          )}
        </Group>
      </header>
      <CodeEditor
        value={text}
        lang={lang}
        readOnly={!editable}
        fontSize={fontSizeOverride ?? fontSize}
        theme={theme}
        onEditorMount={onEditorMount}
        onTelemetry={editable ? telemetry : undefined}
        onCursor={editable ? api?.cursorReport : undefined}
        vim={vim && editable}
        // Moderators may copy anyone's code, but my own editor only takes pastes from itself.
        allowClipboard={allowClipboard && !editable}
        onChange={editable ? api?.changeText : undefined}
        onRun={editable ? api?.check : undefined}
      />
      <Modal opened={confirm != null} onClose={() => setConfirm(null)} title={confirm ? confirmCopy[confirm].title : null} centered size="sm">
        <Text size="sm">{confirm ? confirmCopy[confirm].text : null}</Text>
        <Group justify="flex-end" gap="xs" mt="md">
          <Button variant="default" onClick={() => setConfirm(null)}>
            {t('Cancel')}
          </Button>
          <Button color="red" onClick={confirmed}>
            {confirm ? confirmCopy[confirm].label : null}
          </Button>
        </Group>
      </Modal>
    </section>
  );
}
