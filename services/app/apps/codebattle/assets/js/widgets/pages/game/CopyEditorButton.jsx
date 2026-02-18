import React from "react";

import copy from "copy-to-clipboard";

import i18n from "../../../i18n";

function CopyEditorButton({ editor }) {
  const className = "btn btn-sm btn-secondary cb-btn-secondary cb-rounded mx-1";
  const text = i18n.t("Copy");

  const handleCopyClick = () => {
    copy(editor.text);
  };

  return (
    <button type="button" className={className} onClick={handleCopyClick} title={text}>
      {text}
    </button>
  );
}

export default CopyEditorButton;
