import { Anchor, Badge, Button, Group, Modal, SegmentedControl, Text } from '@mantine/core';
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

interface TaskPanelProps {
  task: GameTask;
  /** A Preview button opening the task in a modal (which shares this panel's language). */
  withPreview?: boolean;
  /** Controlled language, so the strip and its preview switch together. */
  lang?: DescriptionLang;
  onLangChange?: (lang: DescriptionLang) => void;
  /** Leave the examples out (shown in a pane of their own on the broadcast). */
  hideExamples?: boolean;
  /** Leave out the "send a PR" footer of GitHub tasks (the broadcast). */
  hideContribution?: boolean;
}

export function TaskPanel({
  task,
  withPreview = false,
  lang: controlledLang,
  onLangChange,
  hideExamples = false,
  hideContribution = false,
}: TaskPanelProps) {
  const { t, i18n } = useTranslation();
  const [preview, { open, close }] = useDisclosure(false);
  const hasRu = Boolean(task.description_ru?.trim());
  const hasEn = Boolean(task.description_en?.trim());
  const [ownLang, setOwnLang] = useState<DescriptionLang>((i18n.language === 'ru' && hasRu) || !hasEn ? 'ru' : 'en');
  const lang = controlledLang ?? ownLang;
  const setLang = onLangChange ?? setOwnLang;
  const description = (lang === 'ru' ? task.description_ru : task.description_en) ?? '';
  const examples = !hideExamples && task.examples?.trim() ? `\n\n**${lang === 'ru' ? 'Примеры' : 'Examples'}:**\n${codeBlock(task.examples)}` : '';

  return (
    <div className={classes.task}>
      {((hasRu && hasEn) || withPreview) && (
        <div className={classes.taskCorner}>
          {hasRu && hasEn && (
            <SegmentedControl
              size="xs"
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
              variant="default"
              leftSection={<IconWindowMaximize size={13} />}
              onClick={open}
              aria-label={t('Open the task in a window')}
            >
              {t('Preview')}
            </Button>
          )}
        </div>
      )}
      <div className={classes.description}>
        <Markdown>{`${description}${examples}`}</Markdown>
      </div>
      {task.origin === 'github' && task.tags?.length && !hideContribution ? (
        <Text size="xs" c="dimmed" fs="italic" mt="sm" className={classes.contribution}>
          {t('Found a mistake? Have something to add? Pull Requests are welcome: ')}
          <Anchor href={taskSourceUrl(task)} target="_blank" rel="noopener noreferrer" size="xs" inherit>
            <IconBrandGithub size={13} className={classes.contributionIcon} />
            hexlet-codebattle/tasks
          </Anchor>
        </Text>
      ) : null}
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
