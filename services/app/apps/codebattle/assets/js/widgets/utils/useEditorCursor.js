import { useEffect, useCallback } from 'react';

import * as GameActions from '../middlewares/Room';

/**
 * @param {object} editor
*/
const useEditorCursor = (editor) => {
  const handleChangeCursorSelection = useCallback((e) => {
    const { readOnly, canSendCursor } = editor.getRawOptions();

    if (!canSendCursor) {
      return;
    }

    if (readOnly) {
      const { column, lineNumber } = editor.getPosition();

      editor.setPosition({ lineNumber, column });
    } else {
      const startOffset = editor.getModel().getOffsetAt(e.selection.getStartPosition());
      const endOffset = editor.getModel().getOffsetAt(e.selection.getEndPosition());

      GameActions.sendEditorCursorSelection(startOffset, endOffset);
    }
  }, [editor]);

  const handleChangeCursorPosition = useCallback((e) => {
    const { readOnly, canSendCursor } = editor.getRawOptions();

    if (!canSendCursor) {
      return;
    }

    if (!readOnly) {
      const offset = editor.getModel().getOffsetAt(e.position);

      GameActions.sendEditorCursorPosition(offset);
    }
  }, [editor]);

  useEffect(() => {
    if (editor) {
      editor.onDidChangeCursorSelection(handleChangeCursorSelection);
      editor.onDidChangeCursorPosition(handleChangeCursorPosition);
    }
  }, [editor, handleChangeCursorSelection, handleChangeCursorPosition]);
};

export default useEditorCursor;
