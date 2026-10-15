import { Badge, Button, Group, Modal, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBrandGithub, IconWindowMaximize } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { Markdown } from '@/shared/Markdown';

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

/** The task description (EN/RU when both exist) and its examples; the name and level live in the top bar. */
type DescriptionLang = 'en' | 'ru';

// The EN/RU pick outlives the game: the next task (e.g. the next tournament round) opens in it.
const LANG_KEY = 'cb.taskDescriptionLang';

function storedLang(): DescriptionLang | null {
  try {
    const value = window.localStorage.getItem(LANG_KEY);
    return value === 'en' || value === 'ru' ? value : null;
  } catch {
    return null;
  }
}

function storeLang(lang: DescriptionLang) {
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
  lang?: DescriptionLang;
  onLangChange?: (lang: DescriptionLang) => void;
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
  const hasRu = Boolean(task.description_ru?.trim());
  const hasEn = Boolean(task.description_en?.trim());
  const [ownLang, setOwnLang] = useState<DescriptionLang>(() => storedLang() ?? (i18n.language === 'ru' ? 'ru' : 'en'));
  const wanted = controlledLang ?? ownLang;
  // A task without the wanted language shows the one it has (the pick itself is kept).
  const lang: DescriptionLang = wanted === 'ru' ? (hasRu || !hasEn ? 'ru' : 'en') : hasEn || !hasRu ? 'en' : 'ru';
  const setLang = (next: DescriptionLang) => {
    storeLang(next);
    (onLangChange ?? setOwnLang)(next);
  };
  const description = (lang === 'ru' ? task.description_ru : task.description_en) ?? '';
  // No "Examples:" heading: the code block right under the description speaks for itself.
  const examples = !hideExamples && task.examples?.trim() ? `\n\n${codeBlock(task.examples)}` : '';
  const withContribution = task.origin === 'github' && Boolean(task.tags?.length) && !hideContribution;
  const withControls = (hasRu && hasEn) || withPreview || withContribution;

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
              {hasRu && hasEn && (
                <SegmentedControl
                  size="xs"
                  fullWidth
                  className={classes.langSwitch}
                  vars={() => ({ root: { '--sc-padding': '1px 6px', '--sc-font-size': '10px' } })}
                  value={lang}
                  onChange={(value) => setLang(value as DescriptionLang)}
                  data={[
                    { value: 'en', label: 'EN' },
                    { value: 'ru', label: 'RU' },
                  ]}
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
          <TaskPanel task={task} lang={lang} onLangChange={setLang} hideContribution={hideContribution} />
        </Modal>
      )}
    </div>
  );
}
