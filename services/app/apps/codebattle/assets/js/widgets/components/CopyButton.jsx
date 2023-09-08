import React, { useState, useCallback } from 'react';

import copy from 'copy-to-clipboard';
import i18n from 'i18next';

function CopyButton({ className, disabled = false, value }) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(() => {
    copy(value);
    setCopied(true);
  }, [value]);

  const textButtonCopy = copied ? 'Copied' : 'Copy';

  return (
    <button
      className={className}
      data-testid="copy-button"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {i18n.t(textButtonCopy)}
    </button>
  );
}

export default CopyButton;
