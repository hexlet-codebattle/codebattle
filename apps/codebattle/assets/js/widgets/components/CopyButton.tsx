import React, { useCallback, useState } from 'react';

import { Button } from '@mantine/core';

import copy from 'copy-to-clipboard';
import i18n from 'i18next';

interface CopyButtonProps {
  className?: string;
  disabled?: boolean;
  size?: string;
  style?: React.CSSProperties;
  value: string;
}

function CopyButton({ className, disabled = false, size, style, value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(() => {
    copy(value);
    setCopied(true);
  }, [value]);

  const textButtonCopy = copied ? 'Copied' : 'Copy';

  return (
    <Button
      type="button"
      color="cbSecondary"
      radius="md"
      size={size}
      className={className}
      style={style}
      onClick={onClick}
      data-testid="copy-button"
      disabled={disabled}
    >
      {i18n.t(textButtonCopy)}
    </Button>
  );
}

export default CopyButton;
