import { Badge, Button, Group, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBrandGithub, IconWindowMaximize } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { isLocale, type Locale, normalizeLocale } from '@/i18n';
import { LocaleSelect } from '@/shared/LocaleSelect';
import { Markdown } from '@/shared/Markdown';
import { availableDescriptionLocales, descriptionField, taskDescriptionLocale } from '@/shared/taskDescription';

import type { GameTask } from '../types';
import classes from '../GameRoom.module.css';

// Examples come fenced or bare; re-fence the trimmed body so stray blank lines don't pad the block.
const codeBlock = (examples: string) => {
  const trimmed = examples.trim();
  const fenced = trimmed.match(/^```([^\n]*)\n([\s\S]*?)\n?```$/);
  const [info, body] = fenced ? [fenced[1].trim(), fenced[2]] : ['', trimmed];
  return `\`\`\`${info}\n${body.replace(/^\s*\n|\s+$/g, '')}\n\`\`\``;
};

// Same path scheme as the hexlet-codebattle/tasks repo (and the legacy page).
const taskSourceUrl = (task: GameTask) =>
  `https://github.com/hexlet-codebattle/tasks/tree/master/tasks/${task.level}/${task.tags?.[0]}/${task.name}.toml`;

// The language pick outlives the game: the next tournament task opens in it when available.
const LANG_KEY = 'cb.taskDescriptionLang';

function storedLang(): Locale | null {
  try {
    const value = window.localStorage.getItem(LANG_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function storeLang(lang: Locale) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Storage blocked (private mode): the pick lasts for this page only.
  }
}

interface TaskPanelProps {
  task: GameTask;
  /** A Preview button opening the task in a modal (which shares this panel's language). */
  withPreview?: boolean;
  /** Controlled language, so the strip and its preview switch together. */
  lang?: Locale;
  onLangChange?: (lang: Locale) => void;
  /** Leave the examples out (shown in a pane of their own on the broadcast). */
  hideExamples?: boolean;
  /** Leave out the "send a PR" link of GitHub tasks (the broadcast). */
  hideContribution?: boolean;
  /** The level and task name above the description (the game strip; the top bar has no name). */
  withTitle?: boolean;
}

export function TaskPanel({
  task,
  withPreview = false,
  lang: controlledLang,
  onLangChange,
  hideExamples = false,
  hideContribution = false,
  withTitle = false,
}: TaskPanelProps) {
  const { t, i18n } = useTranslation();
  const [preview, { open, close }] = useDisclosure(false);
  const availableLocales = availableDescriptionLocales(task);
  const [ownLang, setOwnLang] = useState<Locale | null>(storedLang);
  const wanted = controlledLang ?? ownLang ?? normalizeLocale(i18n.language);
  // A task without the wanted language shows the one it has (the pick itself is kept).
  const lang = taskDescriptionLocale(task, wanted);
  const setLang = (next: Locale) => {
    storeLang(next);
    (onLangChange ?? setOwnLang)(next);
  };
  const description = task[descriptionField(lang)] ?? '';
  // No "Examples:" heading: the code block right under the description speaks for itself.
  const examples = !hideExamples && task.examples?.trim() ? `\n\n${codeBlock(task.examples)}` : '';
  const withContribution = task.origin === 'github' && Boolean(task.tags?.length) && !hideContribution;
  const withControls = availableLocales.length > 1 || withPreview || withContribution;

  return (
    <div className={classes.task}>
      {/* Floats top-right so the description wraps around it instead of losing a line to it. */}
      {(withControls || withTitle) && (
        <div className={classes.taskCorner}>
          {withTitle && (
            <Stack gap={4} align="flex-end" className={classes.taskTitle}>
              <Badge size="sm" variant="light" color={LEVEL_COLORS[task.level as GameLevel] ?? 'gray'}>
                {levelLabel(task.level as GameLevel)}
              </Badge>
              <Text span size="sm" fw={700} c="bright" ff="monospace" truncate maw="100%">
                {task.name}
              </Text>
            </Stack>
          )}
          {/* One control per row, all as wide as the widest; kept quiet next to the description. */}
          {withControls && (
            <div className={classes.taskControls}>
              {availableLocales.length > 1 && (
                <LocaleSelect
                  value={lang}
                  onChange={setLang}
                  locales={availableLocales}
                  label={t('Task description language')}
                />
              )}
              {withPreview && (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  fw={400}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconWindowMaximize size={12} />}
                  onClick={open}
                  aria-label={t('Open the task in a window')}
                >
                  {t('Preview')}
                </Button>
              )}
              {withContribution && (
                <Tooltip label={t('Found a mistake? Send a Pull Request on GitHub')}>
                  <Button
                    component="a"
                    href={taskSourceUrl(task)}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="compact-xs"
                    variant="subtle"
                    color="gray"
                    fw={400}
                    fullWidth
                    justify="flex-start"
                    leftSection={<IconBrandGithub size={12} />}
                  >
                    {t('Suggest a fix')}
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}
      <div className={classes.description}>
        <Markdown>{`${description}${examples}`}</Markdown>
      </div>
      {withPreview && (
        <Modal
          opened={preview}
          onClose={close}
          size="xl"
          title={
            <Group gap={8} wrap="nowrap">
              <Badge size="sm" variant="light" color={LEVEL_COLORS[task.level as GameLevel] ?? 'gray'}>
                {levelLabel(task.level as GameLevel)}
              </Badge>
              <Text fw={700} c="bright">
                {task.name}
              </Text>
            </Group>
          }
        >
          <TaskPanel task={task} lang={wanted} onLangChange={setLang} hideContribution={hideContribution} />
        </Modal>
      )}
    </div>
  );
}
