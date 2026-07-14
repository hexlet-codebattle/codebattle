import React, { useCallback, useState } from 'react';

import copy from 'copy-to-clipboard';
import i18n from 'i18next';

interface CopyButtonProps {
  className?: string;
  disabled?: boolean;
  value: string;
}

function CopyButton({ className, value, disabled = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(() => {
    copy(value);
    setCopied(true);
  }, [value]);

  const textButtonCopy = copied ? 'Copied' : 'Copy';

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      data-testid="copy-button"
      disabled={disabled}
    >
      {i18n.t(textButtonCopy)}
    </button>
  );
}

export default CopyButton;
