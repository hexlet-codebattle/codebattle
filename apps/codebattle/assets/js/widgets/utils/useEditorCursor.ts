import { useEffect, useCallback } from 'react';

import * as GameActions from '../middlewares/Room';

// Monaco editor instance and its event payloads have no lightweight shared
// type available here, so they are typed loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useEditorCursor = (editor: any) => {
  const handleChangeCursorSelection = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
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
    },
    [editor],
  );

  const handleChangeCursorPosition = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const { readOnly, canSendCursor } = editor.getRawOptions();

      if (!canSendCursor) {
        return;
      }

      if (!readOnly) {
        const offset = editor.getModel().getOffsetAt(e.position);

        GameActions.sendEditorCursorPosition(offset);
      }
    },
    [editor],
  );

  const handleScrollChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const { readOnly, canSendCursor } = editor.getRawOptions();

      if (!canSendCursor || readOnly) {
        return;
      }

      GameActions.sendEditorScrollPosition(e.scrollTop, e.scrollLeft);
    },
    [editor],
  );

  useEffect(() => {
    if (editor) {
      editor.onDidChangeCursorSelection(handleChangeCursorSelection);
      editor.onDidChangeCursorPosition(handleChangeCursorPosition);
      editor.onDidScrollChange(handleScrollChange);
    }
  }, [editor, handleChangeCursorSelection, handleChangeCursorPosition, handleScrollChange]);
};

export default useEditorCursor;
