import React, { useRef } from 'react';

import ChatInput from '../../components/ChatInput';

interface TournamentChatInputProps {
  disabled?: boolean;
}

export default function TournamentChatInput({ disabled }: TournamentChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <ChatInput
      inputRef={inputRef as React.RefObject<HTMLInputElement>}
      disabled={disabled}
      variant="tournament"
      forceGeneral
    />
  );
}
