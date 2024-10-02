import { useState, useEffect, useCallback } from 'react';

import editorUserTypes from '../config/editorUserTypes';
import GameRoomModes from '../config/gameModes';
import { addCursorListeners } from '../middlewares/Room';

const useRemoteCursor = (editor, monaco, props) => {
  const {
    gameMode,
    editable,
    userType,
    userId,
    onChangeCursorSelection,
    onChangeCursorPosition,
  } = props;
  const [, setRemoteKeys] = useState([]);
  const [remote, setRemote] = useState({
    cursor: {},
    selection: {},
  });

  const isBuilder = gameMode === GameRoomModes.builder;
  const isHistory = gameMode === GameRoomModes.history;

  const needSubscribeCursorUpdates = !isBuilder && !isHistory;

  const updateRemoteCursorPosition = useCallback(offset => {
    const position = editor.getModel().getPositionAt(offset);
    const userClassName = userType === editorUserTypes.opponent
      ? 'cb-remote-opponent'
      : 'cb-remote-player';

    if (!editable) {
      const cursor = {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        ),
        options: { className: `cb-editor-remote-cursor ${userClassName}` },
      };

      setRemote(oldRemote => ({
        ...oldRemote,
        cursor,
      }));
    }
  }, [setRemote, editor, monaco, editable, userType]);

  const updateRemoteCursorSelection = useCallback((startOffset, endOffset) => {
    const userClassName = userType === editorUserTypes.opponent
      ? 'cb-remote-opponent'
      : 'cb-remote-player';

    if (!editable) {
      const startPosition = editor.getModel().getPositionAt(startOffset);
      const endPosition = editor.getModel().getPositionAt(endOffset);

      const startColumn = startPosition.column;
      const startLineNumber = startPosition.lineNumber;
      const endColumn = endPosition.column;
      const endLineNumber = endPosition.lineNumber;

      const selection = {
        range: new monaco.Range(
          startLineNumber,
          startColumn,
          endLineNumber,
          endColumn,
        ),
        options: { className: `cb-editor-remote-selection ${userClassName}` },
      };

      setRemote(prevRemote => ({
        ...prevRemote,
        selection,
      }));
    }
  }, [setRemote, editor, monaco, editable, userType]);

  const handleChangeCursorSelection = useCallback(e => {
    if (!editable) {
      const { column, lineNumber } = editor.getPosition();
      editor.setPosition({ lineNumber, column });
    } else if (editable && onChangeCursorSelection) {
      const startOffset = editor.getModel().getOffsetAt(e.selection.getStartPosition());
      const endOffset = editor.getModel().getOffsetAt(e.selection.getEndPosition());
      onChangeCursorSelection(startOffset, endOffset);
    }
  }, [editor, editable, onChangeCursorSelection]);

  const handleChangeCursorPosition = useCallback(e => {
    if (editable && onChangeCursorPosition) {
      const offset = editor.getModel().getOffsetAt(e.position);
      onChangeCursorPosition(offset);
    }
  }, [editor, editable, onChangeCursorPosition]);

  useEffect(() => {
    if (remote.cursor.range && remote.selection.range) {
      setRemoteKeys(oldRemoteKeys => (
        editor.deltaDecorations(oldRemoteKeys, Object.values(remote))
      ));
    }
  }, [editor, remote, setRemoteKeys]);

  useEffect(() => {
    if (editor) {
      editor.onDidChangeCursorSelection(handleChangeCursorSelection);
      editor.onDidChangeCursorPosition(handleChangeCursorPosition);
    }
  }, [editor, handleChangeCursorSelection, handleChangeCursorPosition]);

  useEffect(() => {
    if (needSubscribeCursorUpdates) {
      const clearCursorListeners = addCursorListeners(
        userId,
        updateRemoteCursorPosition,
        updateRemoteCursorSelection,
      );

      return clearCursorListeners;
    }

    return () => {};
  }, [
      userId,
      needSubscribeCursorUpdates,
      updateRemoteCursorPosition,
      updateRemoteCursorSelection,
    ]);
};

export default useRemoteCursor;
