import { ActionIcon, Popover, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconMoodSmile } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LangIcon, langName, languageIconSlugs } from '@/shared/LangIcon';
import { useSharedProps } from '@/shared/useSharedProps';

import type { ChatMessage } from '../types';
import type { ChatApi } from '../useChat';

import classes from './MessageReactions.module.css';

const EMOJI_REACTIONS = [
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'smile', emoji: '😊', label: 'Smile' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'clap', emoji: '👏', label: 'Applause' },
  { id: 'eyes', emoji: '👀', label: 'Eyes' },
  { id: 'thumbs_up', emoji: '👍', label: 'Thumbs up' },
];

export function MessageReactions({ message, chat }: { message: ChatMessage; chat: ChatApi }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const [opened, setOpened] = useState(false);
  const reactions = message.reactions ?? {};
  const selected = reactions[String(me.id)]?.reaction;
  const groups = new Map<string, string[]>();

  for (const { reaction, name } of Object.values(reactions)) {
    const names = groups.get(reaction) ?? [];
    names.push(name);
    groups.set(reaction, names);
  }

  const label = (id: string) => id.startsWith('lang:')
    ? langName(id.slice(5))
    : t(EMOJI_REACTIONS.find((option) => option.id === id)?.label ?? id);

  const icon = (id: string) => id.startsWith('lang:')
    ? <LangIcon lang={id.slice(5)} size={16} withTooltip={false} />
    : <span aria-hidden>{EMOJI_REACTIONS.find((option) => option.id === id)?.emoji}</span>;

  const react = (reaction: string) => {
    chat.react(message.id, reaction);
    setOpened(false);
  };

  const options = [...EMOJI_REACTIONS.map(({ id }) => id), ...languageIconSlugs.map((lang) => `lang:${lang}`)];

  return (
    <span className={classes.reactions} data-has-reactions={groups.size > 0 || undefined}>
      {[...groups].sort(([a], [b]) => options.indexOf(a) - options.indexOf(b)).map(([reaction, names]) => (
        <Tooltip key={reaction} label={`${label(reaction)} · ${names.join(', ')}`} multiline maw={280}>
          <UnstyledButton
            className={classes.reaction}
            data-selected={selected === reaction || undefined}
            aria-pressed={selected === reaction}
            aria-label={`${label(reaction)}: ${names.join(', ')} (${names.length})`}
            disabled={!chat.online || me.id === 0}
            onClick={() => react(reaction)}
          >
            {icon(reaction)}
            <span>{names.length}</span>
          </UnstyledButton>
        </Tooltip>
      ))}
      <Popover opened={opened} onChange={setOpened} position="top-start" withArrow shadow="md" trapFocus>
        <Popover.Target>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            className={classes.add}
            data-opened={opened || undefined}
            disabled={!chat.online || me.id === 0}
            aria-label={t('Add reaction')}
            aria-expanded={opened}
            onClick={() => setOpened((value) => !value)}
          >
            <IconMoodSmile size={16} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <Text size="xs" c="dimmed" mb={6}>{t('One reaction per message')}</Text>
          <div className={classes.options}>
            {options.map((reaction, index) => (
              <Tooltip key={reaction} label={label(reaction)}>
                <UnstyledButton
                  className={classes.option}
                  data-selected={selected === reaction || undefined}
                  data-language={index === EMOJI_REACTIONS.length || undefined}
                  aria-label={label(reaction)}
                  aria-pressed={selected === reaction}
                  disabled={!chat.online}
                  onClick={() => react(reaction)}
                >
                  {icon(reaction)}
                </UnstyledButton>
              </Tooltip>
            ))}
          </div>
        </Popover.Dropdown>
      </Popover>
    </span>
  );
}
