import React from 'react';

import { Button } from '@mantine/core';
import copy from 'copy-to-clipboard';

import i18n from '../../../i18n';

interface CopyEditorButtonProps {
  editor: { text: string };
}

function CopyEditorButton({ editor }: CopyEditorButtonProps) {
  const text = i18n.t('Copy');

  const handleCopyClick = () => {
    copy(editor.text);
  };

  return (
    <Button
      size="compact-sm"
      color="cbSecondary"
      radius="md"
      mx="xs"
      title={text}
      onClick={handleCopyClick}
    >
      {text}
    </Button>
  );
}

export default CopyEditorButton;
