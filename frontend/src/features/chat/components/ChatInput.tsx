import { Combobox, Group, Text, TextInput, type TextInputProps, useCombobox } from '@mantine/core';
import { type KeyboardEvent, type SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';

import { usePresenceStore } from '@/features/presence/store';
import { LangIcon } from '@/shared/LangIcon';
import { useSharedProps } from '@/shared/useSharedProps';

import { searchEmoji } from '../emoji';
import { activeToken } from '../mentions';
import type { ChatMessage } from '../types';

import classes from './Chat.module.css';
import { Emoji } from './Emoji';

const MAX_SUGGESTIONS = 8;

interface Candidate {
  name: string;
  lang: string | null;
  online: boolean;
}

/** People worth mentioning: recent authors first (they're in the conversation), then whoever is online. */
function useMentionCandidates(messages: ChatMessage[]) {
  const { current_user: me } = useSharedProps();
  const online = usePresenceStore((state) => state.users);

  return useMemo(() => {
    const byName = new Map<string, Candidate>();
    const onlineByName = new Map(online.filter((user) => !user.is_bot).map((user) => [user.name.toLowerCase(), user]));
    const add = (name: string, lang: string | null) => {
      const key = name.toLowerCase();
      if (!name || key === me.name.toLowerCase() || byName.has(key)) return;
      const live = onlineByName.get(key);
      byName.set(key, { name, lang: live?.lang ?? lang, online: live != null });
    };

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.type === 'text' && message.name) add(message.name, message.lang ?? null);
    }
    for (const user of onlineByName.values()) add(user.name, user.lang);

    return [...byName.values()];
  }, [messages, online, me.name]);
}

function matchCandidates(candidates: Candidate[], query: string) {
  const needle = query.toLowerCase();
  if (!needle) return candidates.slice(0, MAX_SUGGESTIONS);

  const prefix = candidates.filter((candidate) => candidate.name.toLowerCase().startsWith(needle));
  const inner = candidates.filter(
    (candidate) => !candidate.name.toLowerCase().startsWith(needle) && candidate.name.toLowerCase().includes(needle),
  );

  return [...prefix, ...inner].slice(0, MAX_SUGGESTIONS);
}

interface ChatInputProps extends Omit<TextInputProps, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  /** The chat's messages, to suggest the people talking in it. */
  messages: ChatMessage[];
}

/** The chat's text input, with Slack-style "@name" and ":emoji" autocomplete. */
export function ChatInput({ value, onValueChange, messages, onKeyDown, ...inputProps }: ChatInputProps) {
  const input = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(0);
  // Escape hides the suggestions for the token being typed; a new token brings them back.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const combobox = useCombobox();
  const candidates = useMentionCandidates(messages);

  const token = activeToken(value, caret);
  const trigger = token?.trigger;
  const query = token?.query ?? '';
  const mentionOptions = useMemo(
    () => (trigger === '@' ? matchCandidates(candidates, query) : []),
    [trigger, query, candidates],
  );
  const emojiOptions = useMemo(() => (trigger === ':' ? searchEmoji(query, MAX_SUGGESTIONS) : []), [trigger, query]);
  const optionCount = mentionOptions.length + emojiOptions.length;
  const open = token != null && optionCount > 0 && dismissedAt !== token.start;

  useEffect(() => {
    if (!open) {
      combobox.closeDropdown();
      return;
    }
    combobox.openDropdown();
    // Options mount with the dropdown; highlight the best match once they're in the DOM.
    const frame = requestAnimationFrame(() => combobox.selectFirstOption());
    return () => cancelAnimationFrame(frame);
  }, [open, trigger, query, optionCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const trackCaret = (event: SyntheticEvent<HTMLInputElement>) =>
    setCaret(event.currentTarget.selectionStart ?? event.currentTarget.value.length);

  const insert = (replacement: string) => {
    if (!token) return;
    const next = `${value.slice(0, token.start)}${replacement} ${value.slice(caret).replace(/^ /, '')}`;
    const position = token.start + replacement.length + 1;
    onValueChange(next);
    setCaret(position);
    combobox.closeDropdown();
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(position, position);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (open && event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      combobox.clickSelectedOption();
    } else if (open && token && event.key === 'Escape') {
      setDismissedAt(token.start);
    }
    onKeyDown?.(event);
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(option) => insert(option)}
      position="top-start"
      width={260}
      offset={6}
    >
      <Combobox.Target withKeyboardNavigation={open}>
        <TextInput
          {...inputProps}
          ref={input}
          value={value}
          autoComplete="off"
          onChange={(event) => {
            onValueChange(event.currentTarget.value);
            trackCaret(event);
          }}
          onSelect={trackCaret}
          onKeyDown={handleKeyDown}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={!open}>
        <Combobox.Options>
          {mentionOptions.map((candidate) => (
            <Combobox.Option key={candidate.name} value={`@${candidate.name}`}>
              <Group gap={8} wrap="nowrap">
                <LangIcon lang={candidate.lang} size={14} withTooltip={false} />
                <Text size="sm" truncate>
                  {candidate.name}
                </Text>
                {candidate.online && <span className={classes.onlineDot} />}
              </Group>
            </Combobox.Option>
          ))}
          {emojiOptions.map((emoji) => (
            <Combobox.Option key={emoji.name} value={emoji.char}>
              <Group gap={8} wrap="nowrap">
                <span className={classes.emojiOption}><Emoji value={emoji.char} /></span>
                <Text size="sm" c="dimmed" truncate>
                  :{emoji.name}:
                </Text>
              </Group>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
