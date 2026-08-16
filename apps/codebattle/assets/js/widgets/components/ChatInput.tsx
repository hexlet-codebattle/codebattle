import React, { useState, useEffect, useCallback, useRef } from 'react';

import data from '@emoji-mart/data';
import { Button, Flex, Text, TextInput } from '@mantine/core';
import BadWordsNext from 'bad-words-next';
import { SearchIndex, init } from 'emoji-mart';
import i18next from 'i18next';
import isEmpty from 'lodash/isEmpty';
import { useSelector } from 'react-redux';

import messageTypes from '../config/messageTypes';
import { addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import useClickAway from '../utils/useClickAway';

import EmojiPicker from './EmojiPicker';
import EmojiToolTip from './EmojiTooltip';

// `em-emoji` is the custom element registered by emoji-mart's `init`.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'em-emoji': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id?: string;
        size?: number;
      };
    }
  }
}

const MAX_MESSAGE_LENGTH = 1024;

const trimColons = (message: string) => message.slice(0, message.lastIndexOf(':'));

const getColons = (message: string) => message.slice(message.lastIndexOf(':') + 1);

const emoticonSearchQueries: Record<string, string> = {
  ')': 'smiley',
  '(': 'disappointed',
};

export const getEmojiSearchQuery = (message: string) => {
  const query = getColons(message);

  return emoticonSearchQueries[query] || query;
};

const getTooltipVisibility = async (msg: string) => {
  const endsWithEmojiCodeRegex = /.*:[a-zA-Z]{0,}([^ ])+$/;
  if (!endsWithEmojiCodeRegex.test(msg)) return Promise.resolve(false);
  return !isEmpty(await SearchIndex.search(getEmojiSearchQuery(msg)));
};

interface ChatInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
  mode?: string;
  variant?: 'default' | 'tournament';
  forceGeneral?: boolean;
}

export default function ChatInput({
  inputRef,
  disabled = false,
  variant = 'default',
  forceGeneral = false,
}: ChatInputProps) {
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [isMaxLengthExceeded, setMaxLengthExceeded] = useState(false);
  const [isTooltipVisible, setTooltipVisibility] = useState(false);
  const [text, setText] = useState('');
  const [badwordsReady, setBadwordsReady] = useState(false);
  const activeRoom = useSelector(selectors.activeRoomSelector);
  const badwordsRef = useRef(new BadWordsNext());
  const isTournament = variant === 'tournament';

  useEffect(() => {
    let mounted = true;
    async function loadBadwords() {
      try {
        const enData = await import('bad-words-next/lib/en');
        const ruData = await import('bad-words-next/lib/ru');
        const rlData = await import('bad-words-next/lib/ru_lat');

        if (mounted) {
          badwordsRef.current.add(enData.default || enData);
          badwordsRef.current.add(ruData.default || ruData);
          badwordsRef.current.add(rlData.default || rlData);
          setBadwordsReady(true);
        }
      } catch (error) {
        console.error('Error loading bad words dictionaries:', error);
      }
    }

    loadBadwords();

    return () => {
      mounted = false;
    };
  }, []);

  const isMessageBlank = !text.trim();

  const handleChange = async ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    if (value.length > MAX_MESSAGE_LENGTH) {
      setMaxLengthExceeded(true);
    } else {
      setMaxLengthExceeded(false);
    }
    setText(value);
    setTooltipVisibility(await getTooltipVisibility(value));
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (isTooltipVisible || isMaxLengthExceeded || isMessageBlank) {
      return;
    }

    if (text) {
      let filteredText = text;

      if (badwordsReady) {
        try {
          filteredText = badwordsRef.current.filter(text);
        } catch (error) {
          console.error('Error filtering text:', error);
        }
      }

      const meta = forceGeneral
        ? { type: messageTypes.general }
        : {
            type: activeRoom.targetUserId ? messageTypes.private : messageTypes.general,
            targetUserId: activeRoom.targetUserId,
          };

      const message = { text: filteredText, meta };

      addMessage(message);
      setText('');
    }
  };

  const togglePickerVisibility = useCallback(
    (e: React.SyntheticEvent) => {
      e.stopPropagation();
      setPickerVisibility(!isPickerVisible);
    },
    [setPickerVisibility, isPickerVisible],
  );

  const hidePicker = () => setPickerVisibility(false);

  const hideTooltip = () => setTooltipVisibility(false);

  const handleSelectEmodji = async ({ native }: { native: string }) => {
    const processedMessage = isTooltipVisible ? trimColons(text) : text;
    const input = inputRef.current!;
    const caretPosition = input.selectionStart || 0;
    const before = processedMessage.slice(0, caretPosition);
    const after = processedMessage.slice(caretPosition);
    hidePicker();
    hideTooltip();
    await setText(`${before}${native}${after}`);
    input.focus();
    input.setSelectionRange(caretPosition + native.length, caretPosition + native.length);
  };

  useClickAway(inputRef, () => {
    hideTooltip();
  }, ['click']);

  useEffect(() => {
    init({ data });
  }, []);

  return (
    <Flex
      component="form"
      onSubmit={handleSubmit}
      pos="relative"
      align="stretch"
      mb={0}
      p={isTournament ? undefined : 'sm'}
      className={
        isTournament ? 'cb-tournament-chat-form cb-tournament-chat-input-group' : undefined
      }
      style={
        isTournament ? undefined : { borderTop: '1px solid var(--mantine-color-default-border)' }
      }
    >
      <TextInput
        ref={inputRef}
        flex={1}
        aria-label={i18next.t('Chat message')}
        placeholder={i18next.t('Be nice in chat!')}
        value={text}
        onChange={handleChange}
        disabled={disabled}
        error={isMaxLengthExceeded}
        classNames={isTournament ? { input: 'cb-tournament-chat-input' } : undefined}
        styles={
          isTournament
            ? undefined
            : { input: { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }
        }
      />
      {isMaxLengthExceeded && (
        <Text
          pos="absolute"
          bottom="100%"
          left={0}
          mb={4}
          px="xs"
          py={4}
          fz="xs"
          c="white"
          bg="red.7"
          style={{ borderRadius: 'var(--mantine-radius-sm)', zIndex: 5 }}
        >
          {i18next.t('Message length cannot exceed %{count} characters.', {
            count: MAX_MESSAGE_LENGTH,
          })}
        </Text>
      )}
      {isTooltipVisible && (
        <EmojiToolTip
          query={getEmojiSearchQuery(text)}
          handleSelect={handleSelectEmodji}
          hide={hideTooltip}
        />
      )}
      {isPickerVisible && (
        <EmojiPicker handleSelect={handleSelectEmodji} hide={hidePicker} disabled={disabled} />
      )}
      <Button
        type="button"
        h="100%"
        px="xs"
        radius={0}
        variant={isTournament ? 'subtle' : 'default'}
        onClick={togglePickerVisibility}
        aria-label={i18next.t('Open emoji picker')}
        className={isTournament ? 'cb-tournament-chat-emoji' : undefined}
      >
        <em-emoji id="grinning" size={20} />
      </Button>
      <Button
        type="button"
        h="100%"
        color="cbSecondary"
        onClick={handleSubmit}
        disabled={disabled || isMaxLengthExceeded || isMessageBlank}
        className={isTournament ? 'cb-tournament-chat-send' : undefined}
        styles={
          isTournament ? undefined : { root: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 } }
        }
      >
        {i18next.t('Send')}
      </Button>
    </Flex>
  );
}
