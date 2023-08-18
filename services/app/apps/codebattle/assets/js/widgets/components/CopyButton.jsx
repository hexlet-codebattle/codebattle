import React, { useState, useCallback } from 'react';
import i18n from 'i18next';
import copy from 'copy-to-clipboard';

function CopyButton({ className, value, disabled = false }) {
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
